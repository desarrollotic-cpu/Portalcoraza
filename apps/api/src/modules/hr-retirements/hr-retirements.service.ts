import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssociatesService } from '../associates/associates.service';
import { Associate, AssociateStatus } from '../associates/entities/associate.entity';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AssociateDerivedService } from '../hr-shared/services/associate-derived.service';
import { HrAuditService } from '../hr-shared/services/hr-audit.service';
import { CreateRetirementDto } from './dto/create-retirement.dto';
import { UpdateRetirementDto } from './dto/update-retirement.dto';
import { Retirement } from './entities/retirement.entity';

const EDIT_LOCK_DAYS = 30;

/**
 * Gestión del ciclo de retiro de asociados.
 *
 * Reglas de negocio:
 *   • Al crear un retiro, el asociado pasa a estado RETIRADO automáticamente.
 *   • Se congela la edad y la antigüedad en el momento del retiro.
 *   • Un retiro no puede editarse pasados 30 días desde su creación (excepto
 *     rol GERENCIA).
 *   • El reingreso lo maneja `AssociatesService.readmit` — este módulo no
 *     duplica esa lógica.
 */
@Injectable()
export class HrRetirementsService {
  constructor(
    @InjectRepository(Retirement)
    private readonly retirementRepo: Repository<Retirement>,
    @InjectRepository(Associate)
    private readonly associatesRepo: Repository<Associate>,
    private readonly associates: AssociatesService,
    private readonly derived: AssociateDerivedService,
    private readonly audit: HrAuditService,
  ) {}

  async list(filters: { from?: string; to?: string; reasonId?: string }) {
    const qb = this.retirementRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.associate', 'a')
      .leftJoinAndSelect('a.jobPosition', 'jp')
      .leftJoinAndSelect('a.workCenter', 'wc')
      .leftJoinAndSelect('r.reason', 'reason')
      .leftJoinAndSelect('r.cause', 'cause')
      .orderBy('r.retirementDate', 'DESC');

    if (filters.from) qb.andWhere('r.retirementDate >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('r.retirementDate <= :to', { to: filters.to });
    if (filters.reasonId) qb.andWhere('r.reasonId = :reasonId', { reasonId: filters.reasonId });

    return qb.getMany();
  }

  async findOne(id: string) {
    const retirement = await this.retirementRepo.findOne({
      where: { id },
      relations: ['associate', 'associate.jobPosition', 'associate.workCenter', 'reason', 'cause'],
    });
    if (!retirement) throw new NotFoundException('Retiro no encontrado');
    return retirement;
  }

  async findByAssociate(associateId: string) {
    return this.retirementRepo.find({
      where: { associateId },
      relations: ['reason', 'cause'],
      order: { retirementDate: 'DESC' },
    });
  }

  async create(dto: CreateRetirementDto, user: JwtPayload, ipAddress?: string) {
    const associate = await this.associatesRepo.findOne({
      where: { id: dto.associateId },
      relations: ['jobPosition'],
    });
    if (!associate) throw new NotFoundException('Asociado no encontrado');
    if (associate.status === AssociateStatus.RETIRADO) {
      throw new BadRequestException('El asociado ya está retirado.');
    }

    const ageAtRetirement = this.derived.yearsBetween(associate.birthDate, dto.retirementDate);
    const lastPosition = associate.jobPosition?.name ?? 'Sin cargo';

    const retirement = this.retirementRepo.create({
      ...dto,
      lastPosition,
      ageAtRetirement,
      createdBy: user.sub,
    });
    const savedRetirement = await this.retirementRepo.save(retirement);

    // Marcar asociado como RETIRADO
    await this.associates.markRetired(associate.id, user, ipAddress);

    await this.audit.recordAssociateChange({
      userId: user.sub,
      associateId: associate.id,
      action: 'RETIRE',
      oldValues: { status: associate.status },
      newValues: {
        status: AssociateStatus.RETIRADO,
        retirementDate: dto.retirementDate,
        retirementId: savedRetirement.id,
      },
      ipAddress,
    });

    return this.findOne(savedRetirement.id);
  }

  async update(
    id: string,
    dto: UpdateRetirementDto,
    user: JwtPayload,
    ipAddress?: string,
  ) {
    const existing = await this.retirementRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Retiro no encontrado');

    // Bloqueo de 30 días salvo GERENCIA
    if (user.roleCode !== 'GERENCIA') {
      const ageMs = Date.now() - existing.createdAt.getTime();
      const daysOld = ageMs / (1000 * 60 * 60 * 24);
      if (daysOld > EDIT_LOCK_DAYS) {
        throw new ForbiddenException(
          `Los retiros no pueden editarse pasados ${EDIT_LOCK_DAYS} días. Solicita a GERENCIA.`,
        );
      }
    }

    const snapshot = { ...existing };
    Object.assign(existing, dto);

    // Recalcular edad al retiro si cambia la fecha
    if (dto.retirementDate) {
      const assoc = await this.associatesRepo.findOne({ where: { id: existing.associateId } });
      if (assoc) {
        existing.ageAtRetirement = this.derived.yearsBetween(assoc.birthDate, dto.retirementDate);
      }
    }

    const saved = await this.retirementRepo.save(existing);

    await this.audit.recordAssociateChange({
      userId: user.sub,
      associateId: existing.associateId,
      action: 'EDIT',
      oldValues: snapshot as unknown as Record<string, unknown>,
      newValues: dto as unknown as Record<string, unknown>,
      ipAddress,
    });

    return this.findOne(saved.id);
  }
}
