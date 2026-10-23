import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, LessThan, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { Associate, AssociateStatus } from '../associates/entities/associate.entity';
import { AuditService } from '../audit/audit.service';
import { MonthlySchedulingService } from '../scheduling/monthly-scheduling.service';
import {
  CreateNumeralDto,
  CreateSanctionDto,
  UpdateNumeralDto,
} from './dto/sanctions.dto';
import {
  DisciplinaryNumeral,
  DisciplinarySanction,
  NO_APLICA,
  SanctionStatus,
} from './entities/disciplinary.entities';
import { endDateOf, hoyBogota } from './hr-sanctions.dates';
import { resolucionDe } from './hr-sanctions.scale';

@Injectable()
export class HrSanctionsService {
  private readonly logger = new Logger(HrSanctionsService.name);

  constructor(
    @InjectRepository(DisciplinaryNumeral)
    private readonly numerals: Repository<DisciplinaryNumeral>,
    @InjectRepository(DisciplinarySanction)
    private readonly sanctions: Repository<DisciplinarySanction>,
    @InjectRepository(Associate)
    private readonly associates: Repository<Associate>,
    private readonly audit: AuditService,
    private readonly scheduling: MonthlySchedulingService,
  ) {}

  // ───────────── Catálogo de numerales ─────────────

  listNumerals(soloActivos = false) {
    const qb = this.numerals.createQueryBuilder('n');
    if (soloActivos) qb.andWhere('n.activo = true');
    // 1, 2, … 10, no 1, 10, 11, 2.
    return qb.orderBy("LPAD(n.numeral, 8, '0')", 'ASC').getMany();
  }

  async createNumeral(dto: CreateNumeralDto, userId: string) {
    const numeral = dto.numeral.trim();
    if (await this.numerals.findOne({ where: { numeral } })) {
      throw new ConflictException(`Ya existe el numeral ${numeral}.`);
    }
    const saved = await this.numerals.save(
      this.numerals.create({
        numeral,
        descripcion: dto.descripcion.trim(),
        diasPorVez: dto.diasPorVez,
        activo: dto.activo ?? true,
      }),
    );
    await this.audit.log({
      userId,
      module: 'hr',
      action: 'sanction_numeral.create',
      entityType: 'disciplinary_numeral',
      entityId: saved.id,
      newValue: { numeral, diasPorVez: dto.diasPorVez },
    });
    return saved;
  }

  async updateNumeral(id: string, dto: UpdateNumeralDto, userId: string) {
    const cur = await this.numerals.findOne({ where: { id } });
    if (!cur) throw new NotFoundException('Numeral no encontrado.');
    const diasPorVez = dto.diasPorVez ?? cur.diasPorVez;
    const numeral = dto.numeral?.trim() ?? cur.numeral;
    if (numeral !== cur.numeral && (await this.numerals.findOne({ where: { numeral } }))) {
      throw new ConflictException(`Ya existe el numeral ${numeral}.`);
    }
    // Las sanciones ya registradas guardan su propia copia: cambiar el numeral no las toca.
    Object.assign(cur, {
      numeral,
      descripcion: dto.descripcion?.trim() ?? cur.descripcion,
      diasPorVez,
      activo: dto.activo ?? cur.activo,
    });
    const saved = await this.numerals.save(cur);
    await this.audit.log({
      userId,
      module: 'hr',
      action: 'sanction_numeral.update',
      entityType: 'disciplinary_numeral',
      entityId: id,
      newValue: { numeral, diasPorVez, activo: saved.activo },
    });
    return saved;
  }

  // ───────────── Sanciones ─────────────

  async list(filters: { associateId?: string; status?: SanctionStatus; search?: string }) {
    await this.sync();
    const qb = this.sanctions
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.associate', 'a')
      .orderBy('s.startDate', 'DESC')
      .addOrderBy('s.createdAt', 'DESC')
      .take(500);
    if (filters.associateId) qb.andWhere('s.associateId = :aid', { aid: filters.associateId });
    if (filters.status) qb.andWhere('s.status = :st', { st: filters.status });
    const term = filters.search?.trim();
    if (term) {
      const like = `%${term.toUpperCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('UPPER(a.documentNumber) LIKE :like', { like })
            .orWhere('UPPER(a.firstName) LIKE :like', { like })
            .orWhere('UPPER(a.firstLastName) LIKE :like', { like })
            .orWhere('UPPER(s.numeral) LIKE :like', { like });
        }),
      );
    }
    return qb.getMany();
  }

  async create(dto: CreateSanctionDto, userId: string) {
    const associate = await this.associates.findOne({ where: { id: dto.associateId } });
    if (!associate) throw new NotFoundException('Asociado no encontrado.');
    if (
      associate.status === AssociateStatus.RETIRADO ||
      associate.status === AssociateStatus.INACTIVO
    ) {
      throw new BadRequestException('No se puede sancionar a un asociado retirado o inactivo.');
    }
    const numeral = await this.numerals.findOne({ where: { id: dto.numeralId } });
    if (!numeral || !numeral.activo) {
      throw new BadRequestException('El numeral no existe o está inactivo.');
    }

    const startDate = dto.startDate.slice(0, 10);
    const code = numeral.diasPorVez[dto.ocurrencia - 1] ?? NO_APLICA;
    const res = resolucionDe(code);
    if (!res) {
      throw new BadRequestException(`El numeral ${numeral.numeral} no aplica para esa vez.`);
    }
    const { tipo, dias } = res;
    const esSuspension = tipo === 'SUSPENSION';
    const endDate = endDateOf(startDate, dias);

    if (esSuspension) {
      const cruce = await this.sanctions
        .createQueryBuilder('s')
        .where('s.associateId = :aid', { aid: associate.id })
        .andWhere(`s.tipo = 'SUSPENSION' AND s.status IN ('PROGRAMADA','VIGENTE')`)
        .andWhere('s.startDate <= :end AND s.endDate >= :start', { start: startDate, end: endDate })
        .getOne();
      if (cruce) {
        throw new ConflictException(
          `Ya tiene una suspensión que se cruza (${cruce.startDate} a ${cruce.endDate}, numeral ${cruce.numeral}).`,
        );
      }
    }

    const saved = await this.sanctions.save(
      this.sanctions.create({
        associateId: associate.id,
        numeralId: numeral.id,
        numeral: numeral.numeral,
        descripcion: numeral.descripcion,
        ocurrencia: dto.ocurrencia,
        tipo,
        dias,
        startDate,
        endDate,
        motivo: dto.motivo?.trim() || null,
        // Llamada de atención o sanción pecuniaria no suspenden a nadie: quedan registradas y ya.
        status: esSuspension ? 'PROGRAMADA' : 'CUMPLIDA',
        createdBy: userId,
      }),
    );

    await this.audit.log({
      userId,
      module: 'hr',
      action: 'sanction.create',
      entityType: 'disciplinary_sanction',
      entityId: saved.id,
      newValue: {
        associateId: associate.id,
        documentNumber: associate.documentNumber,
        numeral: saved.numeral,
        ocurrencia: saved.ocurrencia,
        tipo: saved.tipo,
        startDate,
        endDate,
      },
    });

    if (esSuspension) {
      await this.sync(); // si empieza hoy (o ya pasó), se aplica de inmediato
      await this.scheduling.notifyAssociateUnavailable(
        associate.id,
        'tiene una suspensión disciplinaria',
        startDate,
        endDate,
      );
    }
    return this.sanctions.findOneOrFail({ where: { id: saved.id }, relations: { associate: true } });
  }

  async annul(id: string, reason: string, userId: string) {
    const s = await this.sanctions.findOne({ where: { id } });
    if (!s) throw new NotFoundException('Sanción no encontrada.');
    if (s.status === 'ANULADA') throw new BadRequestException('La sanción ya está anulada.');
    const estabaVigente = s.status === 'VIGENTE';
    s.status = 'ANULADA';
    s.annulReason = reason.trim();
    s.annulledBy = userId;
    await this.sanctions.save(s);
    if (estabaVigente) await this.restoreAssociate(s.associateId, s.previousStatus);
    await this.audit.log({
      userId,
      module: 'hr',
      action: 'sanction.annul',
      entityType: 'disciplinary_sanction',
      entityId: id,
      newValue: { reason: s.annulReason },
    });
    return this.sanctions.findOneOrFail({ where: { id }, relations: { associate: true } });
  }

  // ───────────── Motor de estados ─────────────

  /**
   * Aplica las fechas: las sanciones que empiezan hoy suspenden al asociado y las
   * que ya terminaron lo devuelven a su estado anterior. Es idempotente: corre en
   * el cron de medianoche, al arrancar el servidor y al listar/crear.
   */
  async sync(): Promise<void> {
    const hoy = hoyBogota();

    const porIniciar = await this.sanctions.find({
      where: {
        status: 'PROGRAMADA',
        tipo: 'SUSPENSION',
        startDate: LessThanOrEqual(hoy),
        endDate: MoreThanOrEqual(hoy),
      },
    });
    for (const s of porIniciar) {
      const a = await this.associates.findOne({ where: { id: s.associateId } });
      if (a && (a.status === AssociateStatus.ACTIVO || a.status === AssociateStatus.VACACIONES)) {
        s.previousStatus = a.status;
        await this.associates.update(a.id, { status: AssociateStatus.SUSPENDIDO });
      }
      s.status = 'VIGENTE';
      await this.sanctions.save(s);
    }

    const vencidas = await this.sanctions.find({
      where: { status: In(['PROGRAMADA', 'VIGENTE'] as SanctionStatus[]), endDate: LessThan(hoy) },
    });
    for (const s of vencidas) {
      s.status = 'CUMPLIDA';
      await this.sanctions.save(s);
      await this.restoreAssociate(s.associateId, s.previousStatus);
    }
    if (porIniciar.length || vencidas.length) {
      this.logger.log(`Sanciones: ${porIniciar.length} iniciadas, ${vencidas.length} cumplidas`);
    }
  }

  /** Devuelve al asociado a su estado anterior, salvo que siga cubierto por otra suspensión. */
  private async restoreAssociate(associateId: string, previous: string | null) {
    const hoy = hoyBogota();
    const otra = await this.sanctions.findOne({
      where: { associateId, status: 'VIGENTE', endDate: MoreThanOrEqual(hoy) },
    });
    if (otra) return;
    const a = await this.associates.findOne({ where: { id: associateId } });
    // Solo si sigue SUSPENDIDO: si RRHH ya lo cambió a mano (p. ej. lo retiró), no se toca.
    if (a?.status !== AssociateStatus.SUSPENDIDO) return;
    const back =
      previous === AssociateStatus.VACACIONES ? AssociateStatus.VACACIONES : AssociateStatus.ACTIVO;
    await this.associates.update(a.id, { status: back });
  }

  async searchAssociates(q: string, limit = 8) {
    const term = (q ?? '').trim();
    if (term.length < 2) return [];
    const like = `%${term.toUpperCase()}%`;
    const rows = await this.associates
      .createQueryBuilder('a')
      .select(['a.id', 'a.documentNumber', 'a.firstName', 'a.secondName', 'a.firstLastName', 'a.secondLastName', 'a.status'])
      .where(
        new Brackets((sub) => {
          sub
            .where('UPPER(a.documentNumber) LIKE :like', { like })
            .orWhere('UPPER(a.firstName) LIKE :like', { like })
            .orWhere('UPPER(a.secondName) LIKE :like', { like })
            .orWhere('UPPER(a.firstLastName) LIKE :like', { like })
            .orWhere('UPPER(a.secondLastName) LIKE :like', { like });
        }),
      )
      .andWhere('a.status NOT IN (:...out)', { out: [AssociateStatus.RETIRADO, AssociateStatus.INACTIVO] })
      .orderBy('a.firstLastName', 'ASC')
      .take(Math.min(Math.max(limit, 1), 20))
      .getMany();
    return rows.map((r) => ({
      id: r.id,
      documentNumber: r.documentNumber,
      status: r.status,
      fullName: [r.firstName, r.secondName, r.firstLastName, r.secondLastName].filter(Boolean).join(' '),
    }));
  }
}
