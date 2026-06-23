import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateShiftScheduleDto } from './dto/create-shift-schedule.dto';
import { ListShiftSchedulesDto } from './dto/list-shift-schedules.dto';
import { UpdateShiftScheduleDto } from './dto/update-shift-schedule.dto';
import { ShiftSchedule } from './entities/shift-schedule.entity';

@Injectable()
export class SchedulingService {
  constructor(
    @InjectRepository(ShiftSchedule)
    private readonly schedulesRepo: Repository<ShiftSchedule>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateShiftScheduleDto, userId: string) {
    try {
      const saved = await this.schedulesRepo.save(
        this.schedulesRepo.create({
          ...dto,
          createdBy: userId,
          updatedBy: userId,
        }),
      );

      await this.auditService.log({
        userId,
        module: 'scheduling',
        action: 'schedule.create',
        entityType: 'shift_schedule',
        entityId: saved.id,
        newValue: saved as unknown as Record<string, unknown>,
      });

      await this.notificationsService.sendToRole(
        'GERENCIA',
        'Nuevo turno programado',
        `Turno ${saved.shiftType} el ${saved.shiftDate}`,
        'scheduling',
      );

      return saved;
    } catch (error) {
      this.handleOverlapError(error);
      throw error;
    }
  }

  async listByPostAndRange(query: ListShiftSchedulesDto) {
    const qb = this.schedulesRepo
      .createQueryBuilder('schedule')
      .where('schedule.post_id = :postId', { postId: query.postId })
      .andWhere('schedule.shift_date BETWEEN :startDate AND :endDate', {
        startDate: query.startDate,
        endDate: query.endDate,
      })
      .orderBy('schedule.shift_date', 'ASC');

    if (query.associateId) {
      qb.andWhere('schedule.associate_id = :associateId', {
        associateId: query.associateId,
      });
    }

    return qb.getMany();
  }

  async update(id: string, dto: UpdateShiftScheduleDto, userId: string) {
    const existing = await this.schedulesRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Turno no encontrado');
    }

    this.assertFutureDate(existing.shiftDate);

    const oldValue = { ...existing };
    Object.assign(existing, dto, { updatedBy: userId });

    try {
      const saved = await this.schedulesRepo.save(existing);
      await this.auditService.log({
        userId,
        module: 'scheduling',
        action: 'schedule.update',
        entityType: 'shift_schedule',
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

  async remove(id: string, userId: string) {
    const existing = await this.schedulesRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Turno no encontrado');
    }

    this.assertFutureDate(existing.shiftDate);

    await this.schedulesRepo.delete(id);

    await this.auditService.log({
      userId,
      module: 'scheduling',
      action: 'schedule.delete',
      entityType: 'shift_schedule',
      entityId: id,
      oldValue: existing as unknown as Record<string, unknown>,
    });

    return { success: true };
  }

  private handleOverlapError(error: unknown) {
    if (error instanceof QueryFailedError) {
      const dbError = error as QueryFailedError & { code?: string };
      if (dbError.code === '23P01') {
        throw new ConflictException('El asociado ya tiene un turno en esa fecha');
      }
    }
  }

  private assertFutureDate(shiftDate: string) {
    const today = new Date();
    const todayUtc = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
    );

    const shift = new Date(`${shiftDate}T00:00:00.000Z`);
    if (shift.getTime() <= todayUtc) {
      throw new ConflictException(
        'Solo se pueden editar o eliminar turnos con fecha futura',
      );
    }
  }
}
