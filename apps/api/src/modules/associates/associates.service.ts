import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { NotificationsService } from '../notifications/notifications.service';
import { AssociateDerivedService } from '../hr-shared/services/associate-derived.service';
import { HrAuditService } from '../hr-shared/services/hr-audit.service';
import { SensitiveDataService } from '../hr-shared/services/sensitive-data.service';
import { AssociatesQueryDto } from './dto/associates-query.dto';
import { CreateAssociateDto } from './dto/create-associate.dto';
import { ReadmitAssociateDto } from './dto/readmit-associate.dto';
import { UpdateAssociateDto } from './dto/update-associate.dto';
import { AssociateHistory } from './entities/associate-history.entity';
import { Associate, AssociateStatus } from './entities/associate.entity';
import { PositionHistory } from './entities/position-history.entity';

/**
 * Reglas de negocio para el módulo de asociados (RRHH).
 *
 * Aplica:
 *   • auditoría campo-a-campo (delegada a HrAuditService)
 *   • cálculo de campos derivados (edad, antigüedad)
 *   • enmascaramiento Ley 1581 sobre raza / religión / orientación sexual
 *   • preservación de historial de cargos en cada cambio
 *   • flujo de reingreso desde estado RETIRADO
 */
@Injectable()
export class AssociatesService {
  private static readonly RELATIONS = [
    'jobPosition',
    'workCenter',
    'eps',
    'pensionFund',
    'bloodType',
    'gender',
    'sexualOrientation',
    'religion',
    'race',
    'housingType',
    'educationLevel',
    'incomeRange',
    'transportMean',
    'commuteTime',
  ];

  constructor(
    @InjectRepository(Associate)
    private readonly associatesRepo: Repository<Associate>,
    @InjectRepository(AssociateHistory)
    private readonly historyRepo: Repository<AssociateHistory>,
    @InjectRepository(PositionHistory)
    private readonly positionHistoryRepo: Repository<PositionHistory>,
    private readonly hrAudit: HrAuditService,
    private readonly derived: AssociateDerivedService,
    private readonly sensitive: SensitiveDataService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Consultas ────────────────────────────────────────────────────────
  async list(query: AssociatesQueryDto, user: JwtPayload) {
    const qb = this.associatesRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.jobPosition', 'jobPosition')
      .leftJoinAndSelect('a.workCenter', 'workCenter')
      .leftJoinAndSelect('a.eps', 'eps')
      .leftJoinAndSelect('a.gender', 'gender')
      .leftJoinAndSelect('a.bloodType', 'bloodType');

    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    if (query.workCenterId) qb.andWhere('a.workCenterId = :wcId', { wcId: query.workCenterId });
    if (query.jobPositionId) qb.andWhere('a.jobPositionId = :jpId', { jpId: query.jobPositionId });

    if (query.isCritical !== undefined) {
      qb.andWhere('jobPosition.isCritical = :isCritical', {
        isCritical: query.isCritical === 'true',
      });
    }

    if (query.search) {
      const term = `%${query.search.trim().toUpperCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('UPPER(a.documentNumber) LIKE :term', { term })
            .orWhere('UPPER(a.firstName) LIKE :term', { term })
            .orWhere('UPPER(a.secondName) LIKE :term', { term })
            .orWhere('UPPER(a.firstLastName) LIKE :term', { term })
            .orWhere('UPPER(a.secondLastName) LIKE :term', { term });
        }),
      );
    }

    qb.orderBy('a.firstLastName', 'ASC').addOrderBy('a.firstName', 'ASC');

    let rows = await qb.getMany();

    // Filtros post-hoc (antigüedad en memoria porque depende de derivados)
    if (query.tenureMinYears || query.tenureMaxYears) {
      const min = query.tenureMinYears ? parseFloat(query.tenureMinYears) : 0;
      const max = query.tenureMaxYears ? parseFloat(query.tenureMaxYears) : Number.MAX_SAFE_INTEGER;
      rows = rows.filter((a) => {
        const { tenureYears } = this.derived.compute({
          birthDate: a.birthDate,
          hireDate: a.hireDate,
          status: a.status,
        });
        return tenureYears >= min && tenureYears <= max;
      });
    }

    return rows.map((a) => this.enrich(a, user));
  }

  async findOne(id: string, user: JwtPayload) {
    const associate = await this.associatesRepo.findOne({
      where: { id },
      relations: AssociatesService.RELATIONS,
    });
    if (!associate) throw new NotFoundException('Asociado no encontrado');
    return this.enrich(associate, user);
  }

  async history(id: string) {
    await this.assertExists(id);
    return this.historyRepo.find({
      where: { associateId: id },
      order: { createdAt: 'DESC' },
    });
  }

  async positionHistory(id: string) {
    await this.assertExists(id);
    return this.positionHistoryRepo.find({
      where: { associateId: id },
      relations: ['jobPosition', 'workCenter'],
      order: { changedAt: 'DESC' },
    });
  }

  // ─── Comandos ────────────────────────────────────────────────────────
  async create(dto: CreateAssociateDto, user: JwtPayload, ipAddress?: string) {
    const documentNumber = dto.documentNumber.trim();

    const duplicate = await this.associatesRepo.findOne({ where: { documentNumber } });
    if (duplicate) {
      const label = duplicate.status === AssociateStatus.RETIRADO
        ? 'ya existe como RETIRADO — usa la opción de reingreso'
        : 'ya existe como ACTIVO o SUSPENDIDO';
      throw new BadRequestException(
        `El asociado con documento ${documentNumber} ${label}.`,
      );
    }

    const associate = this.associatesRepo.create({
      ...this.normalizeDto(dto),
      documentNumber,
      status: dto.status ?? AssociateStatus.ACTIVO,
      createdBy: user.sub,
      updatedBy: user.sub,
    } as unknown as Associate);

    const saved = await this.associatesRepo.save(associate);

    // Historial de cargo inicial
    if (saved.jobPositionId) {
      await this.positionHistoryRepo.save(
        this.positionHistoryRepo.create({
          associateId: saved.id,
          jobPositionId: saved.jobPositionId,
          workCenterId: saved.workCenterId,
          changeReason: dto.positionChangeReason ?? 'Ingreso inicial',
          changedBy: user.sub,
        }),
      );
    }

    await this.hrAudit.recordAssociateChange({
      userId: user.sub,
      associateId: saved.id,
      action: 'CREATE',
      oldValues: {},
      newValues: saved as unknown as Record<string, unknown>,
      ipAddress,
    });

    return this.findOne(saved.id, user);
  }

  async update(id: string, dto: UpdateAssociateDto, user: JwtPayload, ipAddress?: string) {
    const existing = await this.associatesRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Asociado no encontrado');

    // Verificar duplicado de documento si cambia
    if (dto.documentNumber && dto.documentNumber !== existing.documentNumber) {
      const dup = await this.associatesRepo.findOne({
        where: { documentNumber: dto.documentNumber.trim() },
      });
      if (dup && dup.id !== existing.id) {
        throw new BadRequestException(
          `Ya existe otro asociado con el documento ${dto.documentNumber}`,
        );
      }
    }

    const oldSnapshot = { ...existing };
    const previousPositionId = existing.jobPositionId;

    Object.assign(existing, this.normalizeDto(dto), { updatedBy: user.sub });
    const saved = await this.associatesRepo.save(existing);

    // Cambio de cargo → historial de cargos
    if (dto.jobPositionId && dto.jobPositionId !== previousPositionId) {
      await this.positionHistoryRepo.save(
        this.positionHistoryRepo.create({
          associateId: saved.id,
          jobPositionId: saved.jobPositionId!,
          workCenterId: saved.workCenterId,
          changeReason: dto.positionChangeReason ?? 'Cambio de cargo',
          changedBy: user.sub,
        }),
      );
    }

    await this.hrAudit.recordAssociateChange({
      userId: user.sub,
      associateId: saved.id,
      action: 'EDIT',
      oldValues: oldSnapshot as unknown as Record<string, unknown>,
      newValues: dto as unknown as Record<string, unknown>,
      ipAddress,
    });

    return this.findOne(saved.id, user);
  }

  async readmit(
    id: string,
    dto: ReadmitAssociateDto,
    user: JwtPayload,
    ipAddress?: string,
  ) {
    const associate = await this.associatesRepo.findOne({ where: { id } });
    if (!associate) throw new NotFoundException('Asociado no encontrado');
    if (associate.status !== AssociateStatus.RETIRADO) {
      throw new BadRequestException(
        `El asociado no está en estado RETIRADO (estado actual: ${associate.status}).`,
      );
    }

    const oldSnapshot = { ...associate };
    associate.status = AssociateStatus.ACTIVO;
    associate.hireDate = dto.hireDate;
    associate.jobPositionId = dto.jobPositionId;
    if (dto.workCenterId !== undefined) associate.workCenterId = dto.workCenterId;
    if (dto.folderNumber !== undefined) associate.folderNumber = dto.folderNumber;
    associate.updatedBy = user.sub;

    const saved = await this.associatesRepo.save(associate);

    await this.positionHistoryRepo.save(
      this.positionHistoryRepo.create({
        associateId: saved.id,
        jobPositionId: saved.jobPositionId!,
        workCenterId: saved.workCenterId,
        changeReason: dto.reason ?? 'Reingreso',
        changedBy: user.sub,
      }),
    );

    await this.hrAudit.recordAssociateChange({
      userId: user.sub,
      associateId: saved.id,
      action: 'READMIT',
      oldValues: oldSnapshot as unknown as Record<string, unknown>,
      newValues: saved as unknown as Record<string, unknown>,
      ipAddress,
    });

    return this.findOne(saved.id, user);
  }

  /**
   * Marca al asociado como RETIRADO sin generar la encuesta de salida. La
   * encuesta se registra por el módulo de retiros (retirements).
   */
  async markRetired(id: string, user: JwtPayload, ipAddress?: string) {
    const associate = await this.associatesRepo.findOne({ where: { id } });
    if (!associate) throw new NotFoundException('Asociado no encontrado');

    const oldSnapshot = { ...associate };
    associate.status = AssociateStatus.RETIRADO;
    associate.updatedBy = user.sub;
    const saved = await this.associatesRepo.save(associate);

    await this.hrAudit.recordAssociateChange({
      userId: user.sub,
      associateId: saved.id,
      action: 'RETIRE',
      oldValues: oldSnapshot as unknown as Record<string, unknown>,
      newValues: saved as unknown as Record<string, unknown>,
      ipAddress,
    });

    const name = [saved.firstName, saved.firstLastName].filter(Boolean).join(' ') || 'Sin nombre';
    await this.notifications.sendToRole('RRHH', `Asociado retirado: ${name}`, saved.documentNumber, 'rrhh');
    await this.notifications.sendToRole('GERENCIA', `Asociado retirado: ${name}`, saved.documentNumber, 'rrhh');

    return this.findOne(saved.id, user);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────
  private async assertExists(id: string) {
    const exists = await this.associatesRepo.exists({ where: { id } });
    if (!exists) throw new NotFoundException('Asociado no encontrado');
  }

  /** Normaliza fechas y strings del DTO antes de persistir. */
  private normalizeDto(dto: Partial<CreateAssociateDto>): Partial<Associate> {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dto)) {
      if (v === undefined) continue;
      if (v === '') {
        clean[k] = null;
        continue;
      }
      clean[k] = v;
    }
    delete clean.positionChangeReason;
    return clean as Partial<Associate>;
  }

  /** Añade campos derivados y aplica enmascaramiento sensible. */
  private enrich(associate: Associate, user: JwtPayload) {
    const derived = this.derived.compute({
      birthDate: associate.birthDate,
      hireDate: associate.hireDate,
      status: associate.status,
    });
    const enriched = {
      ...associate,
      ageAtHire: derived.ageAtHire,
      currentAge: derived.currentAge,
      tenureYears: derived.tenureYears,
      fullName: [
        associate.firstName,
        associate.secondName,
        associate.firstLastName,
        associate.secondLastName,
      ]
        .filter(Boolean)
        .join(' ')
        .trim(),
    };
    return this.sensitive.maskAssociate(enriched, user);
  }
}
