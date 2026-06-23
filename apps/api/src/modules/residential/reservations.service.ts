import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateReservationDto, UpdateReservationStatusDto } from './dto/reservation.dto';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { ReservationApprovalMode } from './entities/residential-unit.entity';
import { ResidentialScopeService } from './residential-scope.service';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationsRepo: Repository<Reservation>,
    private readonly scopeService: ResidentialScopeService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(user: JwtPayload, unitId?: string, status?: ReservationStatus) {
    const postIds = await this.scopeService.getPostIdsForUser(user);
    const qb = this.reservationsRepo
      .createQueryBuilder('reservation')
      .innerJoinAndSelect('reservation.unit', 'unit')
      .orderBy('reservation.starts_at', 'DESC');

    if (unitId) {
      await this.scopeService.assertUnitAccess(unitId, user);
      qb.andWhere('reservation.unit_id = :unitId', { unitId });
    } else {
      this.scopeService.applyPostFilter(qb, 'unit', postIds);
    }

    if (status) {
      qb.andWhere('reservation.status = :status', { status });
    }

    return qb.getMany();
  }

  async create(dto: CreateReservationDto, user: JwtPayload) {
    const unit = await this.scopeService.assertUnitAccess(dto.unitId, user);

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (endsAt <= startsAt) {
      throw new BadRequestException('endsAt debe ser posterior a startsAt');
    }

    const isAutoApproval =
      unit.reservationApprovalMode === ReservationApprovalMode.AUTO;
    const initialStatus = isAutoApproval
      ? ReservationStatus.APPROVED
      : ReservationStatus.PENDING;

    try {
      const saved = await this.reservationsRepo.save(
        this.reservationsRepo.create({
          unitId: dto.unitId,
          resourceCode: dto.resourceCode,
          startsAt,
          endsAt,
          approvalMode: unit.reservationApprovalMode,
          status: initialStatus,
          requestedBy: user.sub,
          approvedBy: isAutoApproval ? user.sub : null,
        }),
      );

      await this.auditService.log({
        userId: user.sub,
        module: 'residential',
        action: 'reservation.create',
        entityType: 'reservation',
        entityId: saved.id,
        newValue: saved as unknown as Record<string, unknown>,
      });

      if (initialStatus === ReservationStatus.PENDING) {
        await this.notificationsService.sendToPostAssignees(
          unit.postId,
          'Reserva pendiente de aprobacion',
          `Recurso ${dto.resourceCode} del ${dto.startsAt} al ${dto.endsAt}`,
          'residential',
        );
      }

      return saved;
    } catch (error) {
      this.handleOverlapError(error);
      throw error;
    }
  }

  async updateStatus(id: string, dto: UpdateReservationStatusDto, user: JwtPayload) {
    const existing = await this.reservationsRepo.findOne({
      where: { id },
      relations: { unit: true },
    });

    if (!existing) {
      throw new NotFoundException('Reserva no encontrada');
    }

    await this.scopeService.assertUnitAccess(existing.unitId, user);

    if (
      existing.status === ReservationStatus.CANCELLED ||
      existing.status === ReservationStatus.COMPLETED
    ) {
      throw new ConflictException('La reserva no puede modificarse en este estado');
    }

    const oldValue = { ...existing };
    existing.status = dto.status;

    if (dto.status === ReservationStatus.APPROVED) {
      existing.approvedBy = user.sub;
    }

    if (
      dto.status === ReservationStatus.CANCELLED ||
      dto.status === ReservationStatus.REJECTED
    ) {
      existing.approvedBy = null;
    }

    if (dto.status === ReservationStatus.COMPLETED) {
      existing.approvedBy = existing.approvedBy ?? user.sub;
    }

    try {
      const saved = await this.reservationsRepo.save(existing);

      await this.auditService.log({
        userId: user.sub,
        module: 'residential',
        action: 'reservation.status_update',
        entityType: 'reservation',
        entityId: id,
        oldValue: oldValue as unknown as Record<string, unknown>,
        newValue: saved as unknown as Record<string, unknown>,
      });

      return saved;
    } catch (error) {
      this.handleOverlapError(error);
      throw error;
    }
  }

  private handleOverlapError(error: unknown) {
    if (error instanceof QueryFailedError) {
      const dbError = error as QueryFailedError & { code?: string };
      if (dbError.code === '23P01') {
        throw new ConflictException(
          'Ya existe una reserva aprobada en conflicto para este recurso y horario',
        );
      }
    }
  }
}
