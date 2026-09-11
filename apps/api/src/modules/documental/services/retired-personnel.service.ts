import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { CreateRetiredPersonnelDto } from '../dto/create-retired-personnel.dto';
import { RetiredPersonnel } from '../entities/retired-personnel.entity';
import { SequenceService } from './sequence.service';

@Injectable()
export class RetiredPersonnelService {
  constructor(
    @InjectRepository(RetiredPersonnel)
    private readonly repo: Repository<RetiredPersonnel>,
    private readonly sequence: SequenceService,
    private readonly audit: AuditService,
    @InjectEntityManager()
    private readonly em: EntityManager,
  ) {}

  list(q?: string) {
    const clean = (q || '').replace(/^#/, '').trim();
    const qb = this.repo.createQueryBuilder('p');
    if (clean) {
      const digits = this.digits(clean);
      qb.where(
        `(p.full_name ILIKE :q
          OR p.id_number ILIKE :q
          OR CAST(p.numeric_code AS text) ILIKE :q
          OR REPLACE(REPLACE(REPLACE(p.id_number, '.', ''), '-', ''), ' ', '') ILIKE :digits)`,
        { q: `%${clean.replace(/[%_]/g, '')}%`, digits: `%${digits || clean}%` },
      );
    }
    return qb
      .orderBy('p.numeric_code', 'ASC')
      .take(80)
      .getMany()
      .then((rows) => this.dedupeByCedula(rows));
  }

  peekNextCode() {
    return this.sequence.peek('retired_personnel');
  }

  async searchFromHr(q: string): Promise<{
    nextCode: number;
    matches: Array<{
      idNumber: string;
      fullName: string;
      rrhhStatus: string | null;
      retirementDate: string | null;
      alreadyRegistered: boolean;
      existingCode: number | null;
    }>;
  }> {
    const nextCode = await this.peekNextCode();
    const raw = (q || '').trim();
    if (raw.length < 3) return { nextCode, matches: [] };

    const digits = this.digits(raw);
    const words = raw
      .split(/\s+/)
      .map((w) => w.replace(/[%_]/g, ''))
      .filter((w) => w.length >= 2)
      .slice(0, 4);

    const parts: string[] = [];
    const params: string[] = [];
    if (digits.length >= 4) {
      params.push(digits);
      parts.push(
        `REPLACE(REPLACE(REPLACE(a.document_number, '.', ''), '-', ''), ' ', '') ILIKE '%' || $${params.length} || '%'`,
      );
    }
    if (words.length) {
      const nameExpr = `concat_ws(' ', a.first_name, a.second_name, a.first_last_name, a.second_last_name)`;
      const ands = words.map((w) => {
        params.push(`%${w}%`);
        return `${nameExpr} ILIKE $${params.length}`;
      });
      parts.push(`(${ands.join(' AND ')})`);
    }
    if (!parts.length) return { nextCode, matches: [] };

    const rows = await this.em.query<
      {
        document_number: string;
        first_name: string;
        second_name: string | null;
        first_last_name: string;
        second_last_name: string | null;
        status: string;
        gh_retirement_date: string | null;
      }[]
    >(
      `SELECT a.document_number, a.first_name, a.second_name, a.first_last_name, a.second_last_name, a.status,
              r.retirement_date::text AS gh_retirement_date
       FROM associates a
       LEFT JOIN LATERAL (
         SELECT retirement_date
         FROM associate_retirements
         WHERE associate_id = a.id
         ORDER BY retirement_date DESC
         LIMIT 1
       ) r ON true
       WHERE (${parts.join(' OR ')})
       ORDER BY a.first_last_name NULLS LAST, a.first_name
       LIMIT 15`,
      params,
    );

    const matches = [];
    for (const a of rows) {
      const fullName = [a.first_name, a.second_name, a.first_last_name, a.second_last_name]
        .filter(Boolean)
        .join(' ')
        .trim();
      const existing = await this.findExistingByCedula(a.document_number);
      matches.push({
        idNumber: a.document_number,
        fullName,
        rrhhStatus: a.status ?? null,
        retirementDate: a.gh_retirement_date ? String(a.gh_retirement_date).slice(0, 10) : null,
        alreadyRegistered: !!existing,
        existingCode: existing?.numericCode ?? null,
      });
    }
    return { nextCode, matches };
  }

  private digits(value: string): string {
    return (value || '').replace(/[^0-9a-zA-Z]/gi, '');
  }

  private dedupeByCedula<T extends { idNumber: string; numericCode: number | null; createdAt?: Date }>(rows: T[]): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    const sorted = [...rows].sort((a, b) => (b.numericCode ?? 0) - (a.numericCode ?? 0));
    for (const row of sorted) {
      const key = this.digits(row.idNumber) || row.idNumber;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(row);
    }
    return out;
  }

  private async findExistingByCedula(cedula: string): Promise<RetiredPersonnel | null> {
    const clean = this.digits(cedula);
    if (!clean) return null;
    const rows = await this.em.query<
      Array<{
        id: string;
        full_name: string;
        id_number: string;
        numeric_code: number | null;
        retirement_date: string | null;
        person_type: string;
      }>
    >(
      `SELECT id, full_name, id_number, numeric_code, retirement_date, person_type
       FROM doc_retired_personnel
       WHERE REPLACE(REPLACE(REPLACE(id_number, '.', ''), '-', ''), ' ', '') = $1
       ORDER BY numeric_code DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [clean],
    );
    if (!rows?.length) return null;
    const r = rows[0];
    return this.repo.create({
      id: r.id,
      fullName: r.full_name,
      idNumber: r.id_number,
      numericCode: r.numeric_code,
      retirementDate: r.retirement_date,
      personType: r.person_type,
    });
  }

  /** Busca en RRHH (associates) por número de cédula para autocompletar el formulario (activos o retirados). */
  async lookupAssociate(cedula: string): Promise<{
    found: boolean;
    alreadyRegistered: boolean;
    existingCode: number | null;
    fullName: string | null;
    retirementDate: string | null;
    personType: string | null;
    rrhhStatus: string | null;
  }> {
    try {
      const rawCedula = (cedula || '').trim();
      const cleanCedula = rawCedula.replace(/[^0-9a-zA-Z]/g, '');

      if (!rawCedula) {
        return { found: false, alreadyRegistered: false, existingCode: null, fullName: null, retirementDate: null, personType: null, rrhhStatus: null };
      }

      // 1. Buscar en RRHH (tanto activos como retirados o cualquier estado)
      const rows = await this.em.query<
        {
          first_name: string;
          second_name: string | null;
          first_last_name: string;
          second_last_name: string | null;
          status: string;
          gh_retirement_date: string | null;
        }[]
      >(
        `SELECT a.first_name, a.second_name, a.first_last_name, a.second_last_name, a.status,
                r.retirement_date::text AS gh_retirement_date
         FROM associates a
         LEFT JOIN LATERAL (
           SELECT retirement_date
           FROM associate_retirements
           WHERE associate_id = a.id
           ORDER BY retirement_date DESC
           LIMIT 1
         ) r ON true
         WHERE a.document_number = $1
            OR TRIM(a.document_number) = $1
            OR REPLACE(REPLACE(a.document_number, '.', ''), '-', '') = $2
         LIMIT 1`,
        [rawCedula, cleanCedula],
      );

      // 2. Verificar si ya tiene carpeta en Gestión Documental
      const existing = await this.findExistingByCedula(cleanCedula || rawCedula);

      if (!rows || !rows.length) {
        if (existing) {
          return {
            found: true,
            alreadyRegistered: true,
            existingCode: existing.numericCode ?? null,
            fullName: existing.fullName,
            retirementDate: existing.retirementDate,
            personType: existing.personType,
            rrhhStatus: null,
          };
        }
        return {
          found: false,
          alreadyRegistered: false,
          existingCode: null,
          fullName: null,
          retirementDate: null,
          personType: null,
          rrhhStatus: null,
        };
      }

      const a = rows[0];
      const parts = [a.first_name, a.second_name, a.first_last_name, a.second_last_name].filter(Boolean);
      const fullName = parts.join(' ').trim();
      const retirementDate = a.gh_retirement_date
        ? String(a.gh_retirement_date).slice(0, 10)
        : null;

      if (existing) {
        return {
          found: true,
          alreadyRegistered: true,
          existingCode: existing.numericCode ?? null,
          fullName: existing.fullName || fullName,
          retirementDate: existing.retirementDate || retirementDate,
          personType: existing.personType || 'ASOCIADO',
          rrhhStatus: a.status,
        };
      }

      return {
        found: true,
        alreadyRegistered: false,
        existingCode: null,
        fullName,
        retirementDate,
        personType: 'ASOCIADO',
        rrhhStatus: a.status,
      };
    } catch (err) {
      console.error('Error in lookupAssociate:', err);
      return {
        found: false,
        alreadyRegistered: false,
        existingCode: null,
        fullName: null,
        retirementDate: null,
        personType: null,
        rrhhStatus: null,
      };
    }
  }

  async create(dto: CreateRetiredPersonnelDto, userId: string) {
    const rawCedula = dto.idNumber.trim();
    const cleanCedula = rawCedula.replace(/[^0-9a-zA-Z]/g, '');
    const duplicated = await this.findExistingByCedula(cleanCedula || rawCedula);
    if (duplicated) {
      throw new ConflictException(
        `Esta cédula ya tiene carpeta #${duplicated.numericCode ?? duplicated.id} en archivo inactivo.`,
      );
    }

    const numeric = await this.sequence.next('retired_personnel');

    const saved = await this.repo.save(
      this.repo.create({
        fullName: dto.fullName,
        idNumber: rawCedula,
        retirementDate: dto.retirementDate ?? null,
        retirementReason: dto.retirementReason ?? null,
        observations: dto.observations ?? null,
        personType: dto.personType ?? 'EMPLEADO',
        numericCode: numeric,
        voxelsera: dto.voxelsera ?? null,
      }),
    );

    // Si el asociado existe en RRHH (tabla associates), pasarlo de inmediato a estado 'RETIRADO'
    try {
      await this.em.query(
        `UPDATE associates
         SET status = 'RETIRADO', updated_at = NOW()
         WHERE (
           document_number = $1
           OR TRIM(document_number) = $1
           OR REPLACE(REPLACE(document_number, '.', ''), '-', '') = $2
         )
         AND status != 'RETIRADO'`,
        [rawCedula, cleanCedula],
      );
    } catch (err) {
      // Registrar si ocurre error al sincronizar estado en RRHH
      console.error('Error actualizando estado a RETIRADO en RRHH:', err);
    }

    await this.audit.log({
      userId,
      module: 'documental',
      action: 'retired_personnel.create',
      entityType: 'doc_retired_personnel',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async updateType(id: string, personType: string, userId: string) {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Registro no encontrado');
    }
    existing.personType = personType;
    const saved = await this.repo.save(existing);
    await this.audit.log({
      userId,
      module: 'documental',
      action: 'retired_personnel.update_type',
      entityType: 'doc_retired_personnel',
      entityId: id,
      newValue: { personType } as Record<string, unknown>,
    });
    return saved;
  }
}
