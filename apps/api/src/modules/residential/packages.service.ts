import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreatePackageDto } from './dto/package.dto';
import { Package, PackageStatus } from './entities/package.entity';
import { ResidentialScopeService } from './residential-scope.service';

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(Package)
    private readonly packagesRepo: Repository<Package>,
    private readonly scopeService: ResidentialScopeService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(user: JwtPayload, unitId?: string, status?: PackageStatus) {
    const postIds = await this.scopeService.getPostIdsForUser(user);
    const qb = this.packagesRepo
      .createQueryBuilder('pkg')
      .innerJoin('pkg.unit', 'unit')
      .orderBy('pkg.received_at', 'DESC');

    if (unitId) {
      await this.scopeService.assertUnitAccess(unitId, user);
      qb.andWhere('pkg.unit_id = :unitId', { unitId });
    } else {
      this.scopeService.applyPostFilter(qb, 'unit', postIds);
    }

    if (status) {
      qb.andWhere('pkg.status = :status', { status });
    }

    return qb.getMany();
  }

  async receive(dto: CreatePackageDto, user: JwtPayload) {
    const unit = await this.scopeService.assertUnitAccess(dto.unitId, user);

    const saved = await this.packagesRepo.save(
      this.packagesRepo.create({
        ...dto,
        status: PackageStatus.RECEIVED,
        receivedAt: new Date(),
      }),
    );

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'package.receive',
      entityType: 'package',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    await this.notificationsService.sendToPostAssignees(
      unit.postId,
      'Paquete recibido',
      dto.description ?? dto.sender ?? 'Nuevo paquete en porteria',
      'residential',
    );

    return saved;
  }

  async deliver(id: string, user: JwtPayload) {
    const pkg = await this.packagesRepo.findOne({
      where: { id },
      relations: { unit: true },
    });

    if (!pkg) {
      throw new NotFoundException('Paquete no encontrado');
    }

    await this.scopeService.assertUnitAccess(pkg.unitId, user);

    if (pkg.status === PackageStatus.DELIVERED) {
      throw new ConflictException('El paquete ya fue entregado');
    }

    pkg.status = PackageStatus.DELIVERED;
    pkg.deliveredAt = new Date();
    const saved = await this.packagesRepo.save(pkg);

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'package.deliver',
      entityType: 'package',
      entityId: id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }
}
