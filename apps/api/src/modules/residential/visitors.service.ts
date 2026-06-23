import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UpdateParkingSlotsDto } from './dto/mail-parking.dto';
import { CreateVisitorDto } from './dto/visitor-vehicle.dto';
import { VirtualLog } from './entities/virtual-log.entity';
import { VisitorParkingHistory } from './entities/visitor-parking-history.entity';
import { VisitorParkingSlot } from './entities/visitor-parking-slot.entity';
import { Visitor } from './entities/visitor.entity';
import { ResidentialScopeService } from './residential-scope.service';

@Injectable()
export class VisitorsService {
  constructor(
    @InjectRepository(Visitor)
    private readonly visitorsRepo: Repository<Visitor>,
    @InjectRepository(VisitorParkingSlot)
    private readonly parkingRepo: Repository<VisitorParkingSlot>,
    @InjectRepository(VisitorParkingHistory)
    private readonly parkingHistoryRepo: Repository<VisitorParkingHistory>,
    @InjectRepository(VirtualLog)
    private readonly virtualLogRepo: Repository<VirtualLog>,
    private readonly scopeService: ResidentialScopeService,
    private readonly auditService: AuditService,
  ) {}

  async listActive(user: JwtPayload, unitId?: string) {
    const postIds = await this.scopeService.getPostIdsForUser(user);
    const qb = this.visitorsRepo
      .createQueryBuilder('visitor')
      .innerJoin('visitor.unit', 'unit')
      .where('visitor.exit_time IS NULL')
      .orderBy('visitor.entry_time', 'DESC');

    if (unitId) {
      await this.scopeService.assertUnitAccess(unitId, user);
      qb.andWhere('visitor.unit_id = :unitId', { unitId });
    } else {
      this.scopeService.applyPostFilter(qb, 'unit', postIds);
    }

    return qb.getMany();
  }

  async listHistory(user: JwtPayload, unitId?: string) {
    const postIds = await this.scopeService.getPostIdsForUser(user);
    const qb = this.visitorsRepo
      .createQueryBuilder('visitor')
      .innerJoin('visitor.unit', 'unit')
      .orderBy('visitor.entry_time', 'DESC')
      .take(100);

    if (unitId) {
      await this.scopeService.assertUnitAccess(unitId, user);
      qb.andWhere('visitor.unit_id = :unitId', { unitId });
    } else {
      this.scopeService.applyPostFilter(qb, 'unit', postIds);
    }

    return qb.getMany();
  }

  async registerEntry(dto: CreateVisitorDto, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(dto.unitId, user);

    const visitor = await this.visitorsRepo.save(
      this.visitorsRepo.create({
        unitId: dto.unitId,
        hostResidentId: dto.hostResidentId ?? null,
        fullName: dto.fullName,
        documentNumber: dto.documentNumber ?? null,
        plate: dto.plate ?? null,
        entryTime: new Date(),
      }),
    );

    if (dto.useParking && dto.plate) {
      await this.occupyParkingSlot(dto.unitId, visitor.id);
    }

    await this.writeVirtualLog(dto.unitId, 'VISITOR_ENTRY', {
      visitorId: visitor.id,
      fullName: visitor.fullName,
      plate: visitor.plate,
    });

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'visitor.entry',
      entityType: 'visitor',
      entityId: visitor.id,
      newValue: visitor as unknown as Record<string, unknown>,
    });

    return visitor;
  }

  async registerExit(id: string, user: JwtPayload) {
    const visitor = await this.visitorsRepo.findOne({
      where: { id },
      relations: { unit: true },
    });

    if (!visitor) {
      throw new NotFoundException('Visitante no encontrado');
    }

    await this.scopeService.assertUnitAccess(visitor.unitId, user);

    if (visitor.exitTime) {
      throw new ConflictException('El visitante ya registro salida');
    }

    visitor.exitTime = new Date();
    const saved = await this.visitorsRepo.save(visitor);

    if (visitor.plate) {
      await this.releaseParkingSlot(visitor.unitId, visitor.id);
    }

    await this.writeVirtualLog(visitor.unitId, 'VISITOR_EXIT', {
      visitorId: visitor.id,
      fullName: visitor.fullName,
      exitTime: saved.exitTime,
    });

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'visitor.exit',
      entityType: 'visitor',
      entityId: id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async listParking(user: JwtPayload) {
    const postIds = await this.scopeService.getPostIdsForUser(user);
    const qb = this.parkingRepo
      .createQueryBuilder('parking')
      .innerJoinAndSelect('parking.unit', 'unit')
      .orderBy('parking.updated_at', 'DESC');

    this.scopeService.applyPostFilter(qb, 'unit', postIds);
    return qb.getMany();
  }

  async getParkingByUnit(unitId: string, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(unitId, user);
    let slot = await this.parkingRepo.findOne({ where: { unitId } });

    if (!slot) {
      slot = await this.parkingRepo.save(
        this.parkingRepo.create({
          unitId,
          totalSlots: 0,
          occupiedSlots: 0,
          availableSlots: 0,
        }),
      );
    }

    return slot;
  }

  async updateParkingCapacity(
    unitId: string,
    dto: UpdateParkingSlotsDto,
    user: JwtPayload,
  ) {
    await this.scopeService.assertUnitAccess(unitId, user);

    if (dto.totalSlots < 0) {
      throw new BadRequestException('totalSlots no puede ser negativo');
    }

    let slot = await this.parkingRepo.findOne({ where: { unitId } });
    if (!slot) {
      slot = this.parkingRepo.create({ unitId, occupiedSlots: 0 });
    }

    if (dto.totalSlots < slot.occupiedSlots) {
      throw new ConflictException(
        'totalSlots no puede ser menor que los cupos ocupados',
      );
    }

    slot.totalSlots = dto.totalSlots;
    slot.availableSlots = dto.totalSlots - slot.occupiedSlots;
    const saved = await this.parkingRepo.save(slot);

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'parking.update_capacity',
      entityType: 'visitor_parking_slot',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async listVirtualLog(unitId: string, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(unitId, user);
    return this.virtualLogRepo.find({
      where: { unitId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  private async writeVirtualLog(
    unitId: string,
    entryType: string,
    payload: Record<string, unknown>,
  ) {
    await this.virtualLogRepo.save(
      this.virtualLogRepo.create({ unitId, entryType, payload }),
    );
  }

  private async occupyParkingSlot(unitId: string, visitorId: string) {
    const slot = await this.getOrCreateParkingSlot(unitId);

    if (slot.availableSlots <= 0) {
      throw new ConflictException('No hay cupos de parqueadero disponibles');
    }

    slot.occupiedSlots += 1;
    slot.availableSlots = slot.totalSlots - slot.occupiedSlots;
    await this.parkingRepo.save(slot);

    await this.parkingHistoryRepo.save(
      this.parkingHistoryRepo.create({
        parkingSlotId: slot.id,
        visitorId,
        action: 'OCCUPY',
      }),
    );
  }

  private async releaseParkingSlot(unitId: string, visitorId: string) {
    const slot = await this.parkingRepo.findOne({ where: { unitId } });
    if (!slot || slot.occupiedSlots <= 0) {
      return;
    }

    slot.occupiedSlots -= 1;
    slot.availableSlots = slot.totalSlots - slot.occupiedSlots;
    await this.parkingRepo.save(slot);

    await this.parkingHistoryRepo.save(
      this.parkingHistoryRepo.create({
        parkingSlotId: slot.id,
        visitorId,
        action: 'RELEASE',
      }),
    );
  }

  private async getOrCreateParkingSlot(unitId: string) {
    let slot = await this.parkingRepo.findOne({ where: { unitId } });
    if (!slot) {
      slot = await this.parkingRepo.save(
        this.parkingRepo.create({
          unitId,
          totalSlots: 0,
          occupiedSlots: 0,
          availableSlots: 0,
        }),
      );
    }
    return slot;
  }
}
