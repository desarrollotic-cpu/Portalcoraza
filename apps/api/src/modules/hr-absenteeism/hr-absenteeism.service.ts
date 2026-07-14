import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as XLSX from 'xlsx';
import { Brackets, Repository } from 'typeorm';
import { Associate } from '../associates/entities/associate.entity';
import { AuditService } from '../audit/audit.service';
import { CreateAbsenceDto, UpdateAbsenceDto } from './dto/absence.dto';
import {
  AbsenteeismEventType,
  AbsenteeismKind,
  AssociateAbsence,
} from './entities/associate-absence.entity';
import { DiagnosisCie10 } from './entities/diagnosis-cie10.entity';

@Injectable()
export class HrAbsenteeismService {
  constructor(
    @InjectRepository(AssociateAbsence)
    private readonly absencesRepo: Repository<AssociateAbsence>,
    @InjectRepository(DiagnosisCie10)
    private readonly diagnosesRepo: Repository<DiagnosisCie10>,
    @InjectRepository(Associate)
    private readonly associatesRepo: Repository<Associate>,
    private readonly auditService: AuditService,
  ) {}

  async list(filters?: {
    kind?: AbsenteeismKind;
    associateId?: string;
    search?: string;
    from?: string;
    to?: string;
  }) {
    const qb = this.absencesRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.associate', 'associate')
      .leftJoinAndSelect('a.diagnosis', 'diagnosis')
      .orderBy('a.startDate', 'DESC');

    if (filters?.kind) qb.andWhere('a.kind = :kind', { kind: filters.kind });
    if (filters?.associateId) {
      qb.andWhere('a.associateId = :associateId', { associateId: filters.associateId });
    }
    if (filters?.from) qb.andWhere('a.startDate >= :from', { from: filters.from });
    if (filters?.to) qb.andWhere('a.endDate <= :to', { to: filters.to });
    if (filters?.search?.trim()) {
      const term = `%${filters.search.trim().toUpperCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('UPPER(associate.documentNumber) LIKE :term', { term })
            .orWhere('UPPER(associate.firstName) LIKE :term', { term })
            .orWhere('UPPER(associate.firstLastName) LIKE :term', { term })
            .orWhere('UPPER(associate.secondName) LIKE :term', { term })
            .orWhere('UPPER(associate.secondLastName) LIKE :term', { term });
        }),
      );
    }

    return qb.getMany();
  }

  async stats() {
    const rows = await this.absencesRepo.find({ relations: { diagnosis: true } });
    const total = rows.length;
    const totalDays = rows.reduce((s, r) => s + (r.absenceDays || 0), 0);
    const medical = rows.filter((r) => r.kind === AbsenteeismKind.MEDICO).length;
    const admin = rows.filter((r) => r.kind === AbsenteeismKind.OTRO).length;

    const byEvent: Record<string, number> = {};
    const byOrigin: Record<string, number> = {};
    for (const r of rows) {
      byEvent[r.eventType] = (byEvent[r.eventType] ?? 0) + 1;
      if (r.kind === AbsenteeismKind.MEDICO) {
        const origin = r.incapacityOrigin?.trim() || 'SIN ORIGEN';
        byOrigin[origin] = (byOrigin[origin] ?? 0) + (r.absenceDays || 0);
      }
    }

    return { total, totalDays, medical, admin, byEvent, byOrigin };
  }

  searchDiagnoses(q: string, limit = 20) {
    const term = (q ?? '').trim();
    if (!term) {
      return this.diagnosesRepo.find({ order: { codigo: 'ASC' }, take: limit });
    }
    return this.diagnosesRepo
      .createQueryBuilder('d')
      .where('UPPER(d.codigo) LIKE :t OR UPPER(d.descripcion) LIKE :t', {
        t: `%${term.toUpperCase()}%`,
      })
      .orderBy('d.codigo', 'ASC')
      .take(Math.min(limit, 50))
      .getMany();
  }

  async create(dto: CreateAbsenceDto, userId: string) {
    await this.assertAssociate(dto.associateId);
    const payload = this.normalizePayload(dto);
    const saved = await this.absencesRepo.save(
      this.absencesRepo.create({
        ...payload,
        createdBy: userId,
      }),
    );
    await this.auditService.log({
      userId,
      module: 'hr',
      action: 'absence.create',
      entityType: 'associate_absence',
      entityId: saved.id,
      newValue: payload as unknown as Record<string, unknown>,
    });
    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdateAbsenceDto, userId: string) {
    const current = await this.findOne(id);
    const next = this.normalizePayload({
      associateId: current.associateId,
      kind: dto.kind ?? current.kind,
      eventType: dto.eventType ?? current.eventType,
      startDate: dto.startDate ?? current.startDate,
      endDate: dto.endDate ?? current.endDate,
      absenceDays: dto.absenceDays ?? current.absenceDays,
      daysInMonth: dto.daysInMonth ?? current.daysInMonth ?? undefined,
      isExtension: dto.isExtension ?? current.isExtension,
      postIncapacityExam: dto.postIncapacityExam ?? current.postIncapacityExam,
      incapacityOrigin:
        dto.incapacityOrigin === undefined
          ? current.incapacityOrigin ?? undefined
          : dto.incapacityOrigin ?? undefined,
      diagnosisId:
        dto.diagnosisId === undefined
          ? current.diagnosisId ?? undefined
          : dto.diagnosisId ?? undefined,
      cause: dto.cause === undefined ? current.cause ?? undefined : dto.cause ?? undefined,
      observations:
        dto.observations === undefined
          ? current.observations ?? undefined
          : dto.observations ?? undefined,
      baseSalary:
        dto.baseSalary === undefined ? current.baseSalary ?? undefined : dto.baseSalary ?? undefined,
      atCosts: dto.atCosts === undefined ? current.atCosts ?? undefined : dto.atCosts ?? undefined,
    });

    await this.absencesRepo.update(id, next);
    await this.auditService.log({
      userId,
      module: 'hr',
      action: 'absence.update',
      entityType: 'associate_absence',
      entityId: id,
      newValue: next as unknown as Record<string, unknown>,
    });
    return this.findOne(id);
  }

  async remove(id: string, userId: string) {
    const current = await this.findOne(id);
    await this.absencesRepo.delete(id);
    await this.auditService.log({
      userId,
      module: 'hr',
      action: 'absence.delete',
      entityType: 'associate_absence',
      entityId: id,
      oldValue: { associateId: current.associateId },
    });
    return { ok: true };
  }

  async findOne(id: string) {
    const row = await this.absencesRepo.findOne({
      where: { id },
      relations: { associate: true, diagnosis: true },
    });
    if (!row) throw new NotFoundException('Ausencia no encontrada');
    return row;
  }

  /**
   * Importa Excel tipo GESTION-HUMANA:
   * - hoja REG AUSENTISMO MED (médico)
   * - hoja OTRO AUSENTISMO (administrativo)
   * - hoja Código del Diagnóstico / DiagnosticosCIE10 (opcional, catálogo)
   */
  async importExcel(buffer: Buffer, userId: string) {
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const report = {
      diagnosesUpserted: 0,
      medicalCreated: 0,
      otherCreated: 0,
      errors: [] as string[],
    };

    const diagSheet =
      wb.Sheets['Código del Diagnóstico'] ||
      wb.Sheets['Codigo del Diagnostico'] ||
      wb.Sheets['DiagnosticosCIE10'] ||
      wb.Sheets['CIE10'];
    if (diagSheet) {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(diagSheet, { defval: '' });
      for (const row of rows) {
        const codigo = String(this.pick(row, ['codigo', 'Código', 'CODIGO', 'code']) ?? '')
          .trim()
          .toUpperCase();
        const descripcion = String(
          this.pick(row, ['descripcion', 'Descripción', 'DESCRIPCION', 'description']) ?? '',
        ).trim();
        if (!codigo || !descripcion) continue;
        const existing = await this.diagnosesRepo.findOne({ where: { codigo } });
        if (existing) {
          existing.descripcion = descripcion;
          await this.diagnosesRepo.save(existing);
        } else {
          await this.diagnosesRepo.save(this.diagnosesRepo.create({ codigo, descripcion }));
        }
        report.diagnosesUpserted += 1;
      }
    }

    const medSheet =
      wb.Sheets['REG AUSENTISMO MED'] ||
      wb.Sheets['REG AUSENTISMO MED.'] ||
      wb.Sheets['Ausentismo Medico'] ||
      wb.Sheets['MEDICO'];
    if (medSheet) {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(medSheet, { defval: '' });
      for (let i = 0; i < rows.length; i++) {
        try {
          await this.importMedicalRow(rows[i], userId);
          report.medicalCreated += 1;
        } catch (err) {
          report.errors.push(`Médico fila ${i + 2}: ${this.errMsg(err)}`);
        }
      }
    }

    const otherSheet =
      wb.Sheets['OTRO AUSENTISMO'] ||
      wb.Sheets['Otro Ausentismo'] ||
      wb.Sheets['OTRO'] ||
      wb.Sheets['ADMINISTRATIVO'];
    if (otherSheet) {
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(otherSheet, { defval: '' });
      for (let i = 0; i < rows.length; i++) {
        try {
          await this.importOtherRow(rows[i], userId);
          report.otherCreated += 1;
        } catch (err) {
          report.errors.push(`Otro fila ${i + 2}: ${this.errMsg(err)}`);
        }
      }
    }

    if (!medSheet && !otherSheet && !diagSheet) {
      throw new BadRequestException(
        'No se encontraron hojas esperadas (REG AUSENTISMO MED, OTRO AUSENTISMO o Código del Diagnóstico).',
      );
    }

    return report;
  }

  private async importMedicalRow(row: Record<string, unknown>, userId: string) {
    const doc = String(
      this.pick(row, ['cedula', 'cédula', 'Cédula', 'documento', 'numeroIdentificacion', 'CC']) ?? '',
    )
      .trim()
      .replace(/\D/g, '');
    if (!doc) throw new BadRequestException('Sin cédula');
    const associate = await this.associatesRepo.findOne({ where: { documentNumber: doc } });
    if (!associate) throw new BadRequestException(`Asociado no encontrado: ${doc}`);

    const start = this.parseDate(
      this.pick(row, ['fechaInicio', 'Fecha Inicio', 'FECHA INICIO', 'inicio']),
    );
    const end = this.parseDate(this.pick(row, ['fechaFin', 'Fecha Fin', 'FECHA FIN', 'fin']));
    if (!start || !end) throw new BadRequestException('Fechas inválidas');

    const diagCode = String(
      this.pick(row, ['diagnostico', 'Diagnóstico', 'codigo', 'CIE10', 'Código CIE']) ?? '',
    )
      .trim()
      .toUpperCase();
    let diagnosisId: string | undefined;
    if (diagCode) {
      const d = await this.diagnosesRepo.findOne({ where: { codigo: diagCode } });
      if (d) diagnosisId = d.id;
    }

    await this.create(
      {
        associateId: associate.id,
        kind: AbsenteeismKind.MEDICO,
        eventType: this.mapEvent(
          String(this.pick(row, ['tipoEvento', 'Tipo Evento', 'evento']) ?? 'D.A.'),
        ),
        startDate: start,
        endDate: end,
        absenceDays: this.daysBetween(start, end),
        isExtension: this.truthy(this.pick(row, ['prorroga', 'Prórroga', 'prórroga'])),
        postIncapacityExam: this.truthy(
          this.pick(row, ['examenPost', 'Examen Post Incapacidad', 'examenPostIncapacidad']),
        ),
        incapacityOrigin: String(
          this.pick(row, ['origen', 'Origen', 'origenIncapacidad']) ?? 'ENFERMEDAD GENERAL',
        )
          .trim()
          .toUpperCase() || undefined,
        diagnosisId,
        observations: String(this.pick(row, ['observaciones', 'Observaciones']) ?? '').trim() || undefined,
      },
      userId,
    );
  }

  private async importOtherRow(row: Record<string, unknown>, userId: string) {
    const doc = String(
      this.pick(row, ['cedula', 'cédula', 'Cédula', 'documento', 'numeroIdentificacion', 'CC']) ?? '',
    )
      .trim()
      .replace(/\D/g, '');
    if (!doc) throw new BadRequestException('Sin cédula');
    const associate = await this.associatesRepo.findOne({ where: { documentNumber: doc } });
    if (!associate) throw new BadRequestException(`Asociado no encontrado: ${doc}`);

    const start = this.parseDate(
      this.pick(row, ['fechaInicio', 'Fecha Inicio', 'FECHA INICIO', 'inicio']),
    );
    const end = this.parseDate(this.pick(row, ['fechaFin', 'Fecha Fin', 'FECHA FIN', 'fin']));
    if (!start || !end) throw new BadRequestException('Fechas inválidas');

    await this.create(
      {
        associateId: associate.id,
        kind: AbsenteeismKind.OTRO,
        eventType: this.mapEvent(
          String(this.pick(row, ['tipoEvento', 'Tipo Evento', 'evento', 'tipo']) ?? 'L.R.'),
        ),
        startDate: start,
        endDate: end,
        absenceDays: this.daysBetween(start, end),
        cause: String(this.pick(row, ['causa', 'Causa', 'tipoPermiso', 'motivo']) ?? '').trim() || undefined,
        observations: String(this.pick(row, ['observaciones', 'Observaciones']) ?? '').trim() || undefined,
      },
      userId,
    );
  }

  private normalizePayload(dto: CreateAbsenceDto) {
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('La fecha fin no puede ser anterior a la fecha inicio');
    }
    if (dto.kind === AbsenteeismKind.MEDICO && !dto.eventType) {
      throw new BadRequestException('Tipo de evento requerido');
    }
    const absenceDays = dto.absenceDays ?? this.daysBetween(dto.startDate, dto.endDate);
    return {
      associateId: dto.associateId,
      kind: dto.kind,
      eventType: dto.eventType,
      startDate: dto.startDate.slice(0, 10),
      endDate: dto.endDate.slice(0, 10),
      absenceDays,
      daysInMonth: dto.daysInMonth ?? null,
      isExtension: dto.isExtension ?? false,
      postIncapacityExam: dto.postIncapacityExam ?? false,
      incapacityOrigin: dto.incapacityOrigin?.trim() || null,
      diagnosisId: dto.diagnosisId ?? null,
      cause: dto.cause?.trim() || null,
      observations: dto.observations?.trim() || null,
      baseSalary: dto.baseSalary ?? null,
      atCosts: dto.atCosts ?? null,
    };
  }

  private async assertAssociate(id: string) {
    const a = await this.associatesRepo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Asociado no encontrado');
    return a;
  }

  private daysBetween(start: string, end: string): number {
    const a = new Date(start.slice(0, 10) + 'T00:00:00');
    const b = new Date(end.slice(0, 10) + 'T00:00:00');
    const diff = Math.round((b.getTime() - a.getTime()) / 86400000) + 1;
    return Math.max(diff, 0);
  }

  private pick(row: Record<string, unknown>, keys: string[]) {
    const entries = Object.entries(row);
    for (const key of keys) {
      const found = entries.find(
        ([k]) => k.trim().toLowerCase() === key.trim().toLowerCase(),
      );
      if (found) return found[1];
    }
    for (const key of keys) {
      const found = entries.find(([k]) =>
        k.trim().toLowerCase().includes(key.trim().toLowerCase()),
      );
      if (found) return found[1];
    }
    return undefined;
  }

  private parseDate(value: unknown): string | null {
    if (value == null || value === '') return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value === 'number') {
      const d = XLSX.SSF.parse_date_code(value);
      if (!d) return null;
      return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
    const s = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      const dd = m[1].padStart(2, '0');
      const mm = m[2].padStart(2, '0');
      const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
    return null;
  }

  private mapEvent(raw: string): AbsenteeismEventType {
    const v = raw.trim().toUpperCase();
    if (v.includes('S.P') || v.includes('SIN PREST')) return AbsenteeismEventType.SP;
    if (v.includes('L.N') || v.includes('NO REMUN')) return AbsenteeismEventType.LNR;
    if (v.includes('L.R') || v.includes('REMUN')) return AbsenteeismEventType.LR;
    if (v.includes('ACT')) return AbsenteeismEventType.ACT;
    return AbsenteeismEventType.DA;
  }

  private truthy(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    const s = String(value ?? '').trim().toUpperCase();
    return ['1', 'SI', 'SÍ', 'TRUE', 'X', 'YES'].includes(s);
  }

  private errMsg(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }
}
