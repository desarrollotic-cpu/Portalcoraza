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
import { CreateIncidentDto, UpdateIncidentDto } from './dto/incident.dto';
import { ResidentialIncidentHistory } from './entities/residential-incident-history.entity';
import {
  ResidentialIncident,
  ResidentialIncidentStatus,
} from './entities/residential-incident.entity';
import { ResidentialScopeService } from './residential-scope.service';

@Injectable()
export class IncidentsService {
  constructor(
    @InjectRepository(ResidentialIncident)
    private readonly incidentsRepo: Repository<ResidentialIncident>,
    @InjectRepository(ResidentialIncidentHistory)
    private readonly historyRepo: Repository<ResidentialIncidentHistory>,
    private readonly scopeService: ResidentialScopeService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async list(user: JwtPayload, unitId?: string, status?: ResidentialIncidentStatus) {
    const postIds = await this.scopeService.getPostIdsForUser(user);
    const qb = this.incidentsRepo
      .createQueryBuilder('incident')
      .innerJoin('incident.unit', 'unit')
      .orderBy('incident.created_at', 'DESC');

    if (unitId) {
      await this.scopeService.assertUnitAccess(unitId, user);
      qb.andWhere('incident.unit_id = :unitId', { unitId });
    } else {
      this.scopeService.applyPostFilter(qb, 'unit', postIds);
    }

    if (status) {
      qb.andWhere('incident.status = :status', { status });
    }

    return qb.getMany();
  }

  async getById(id: string, user: JwtPayload) {
    const incident = await this.incidentsRepo.findOne({ where: { id } });
    if (!incident) {
      throw new NotFoundException('Novedad no encontrada');
    }

    await this.scopeService.assertUnitAccess(incident.unitId, user);

    const history = await this.historyRepo.find({
      where: { incidentId: id },
      order: { createdAt: 'ASC' },
    });

    return { ...incident, history };
  }

  async create(dto: CreateIncidentDto, user: JwtPayload) {
    const unit = await this.scopeService.assertUnitAccess(dto.unitId, user);

    const saved = await this.incidentsRepo.save(
      this.incidentsRepo.create({
        ...dto,
        createdBy: user.sub,
        updatedBy: user.sub,
        openedAt: new Date(),
      }),
    );

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'incident.create',
      entityType: 'residential_incident',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    await this.notificationsService.sendToPostAssignees(
      unit.postId,
      `Novedad residencial: ${saved.title}`,
      saved.description,
      'residential',
    );

    return saved;
  }

  async update(id: string, dto: UpdateIncidentDto, user: JwtPayload) {
    const existing = await this.incidentsRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Novedad no encontrada');
    }

    await this.scopeService.assertUnitAccess(existing.unitId, user);

    if (existing.status === ResidentialIncidentStatus.CERRADA) {
      throw new ConflictException('La novedad cerrada no puede modificarse');
    }

    const trackFields: Array<keyof UpdateIncidentDto> = [
      'status',
      'priority',
      'assignedTo',
      'title',
      'description',
    ];

    for (const field of trackFields) {
      const newVal = dto[field];
      const oldVal = existing[field as keyof ResidentialIncident];
      if (newVal !== undefined && newVal !== oldVal) {
        await this.historyRepo.save(
          this.historyRepo.create({
            incidentId: id,
            changedBy: user.sub,
            fieldName: field,
            oldValue: String(oldVal ?? ''),
            newValue: String(newVal ?? ''),
          }),
        );
      }
    }

    const oldValue = { ...existing };
    Object.assign(existing, dto, { updatedBy: user.sub });

    if (
      dto.status === ResidentialIncidentStatus.CERRADA ||
      dto.status === ResidentialIncidentStatus.RESUELTA
    ) {
      existing.closedAt = new Date();
    }

    const saved = await this.incidentsRepo.save(existing);

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'incident.update',
      entityType: 'residential_incident',
      entityId: id,
      oldValue: oldValue as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }
}
