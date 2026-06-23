import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/visitor-vehicle.dto';
import { Vehicle } from './entities/vehicle.entity';
import { ResidentialScopeService } from './residential-scope.service';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepo: Repository<Vehicle>,
    private readonly scopeService: ResidentialScopeService,
    private readonly auditService: AuditService,
  ) {}

  async listByUnit(unitId: string, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(unitId, user);
    return this.vehiclesRepo.find({ where: { unitId }, order: { createdAt: 'DESC' } });
  }

  async create(unitId: string, dto: CreateVehicleDto, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(unitId, user);
    const saved = await this.vehiclesRepo.save(
      this.vehiclesRepo.create({ ...dto, unitId }),
    );

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'vehicle.create',
      entityType: 'vehicle',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async update(unitId: string, id: string, dto: UpdateVehicleDto, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(unitId, user);
    const existing = await this.vehiclesRepo.findOne({ where: { id, unitId } });
    if (!existing) {
      throw new NotFoundException('Vehiculo no encontrado');
    }

    const oldValue = { ...existing };
    Object.assign(existing, dto);
    const saved = await this.vehiclesRepo.save(existing);

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'vehicle.update',
      entityType: 'vehicle',
      entityId: id,
      oldValue: oldValue as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async remove(unitId: string, id: string, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(unitId, user);
    const existing = await this.vehiclesRepo.findOne({ where: { id, unitId } });
    if (!existing) {
      throw new NotFoundException('Vehiculo no encontrado');
    }

    await this.vehiclesRepo.delete(id);

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'vehicle.delete',
      entityType: 'vehicle',
      entityId: id,
      oldValue: existing as unknown as Record<string, unknown>,
    });

    return { success: true };
  }
}
