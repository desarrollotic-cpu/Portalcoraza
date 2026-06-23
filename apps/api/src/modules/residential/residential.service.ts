import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Post } from '../posts/entities/post.entity';
import {
  CreatePersonDto,
  CreateResidentDto,
  UpdatePersonDto,
  UpdateResidentDto,
} from './dto/person.dto';
import {
  CreateResidentialUnitDto,
  UpdateResidentialUnitDto,
} from './dto/residential-unit.dto';
import { CreateMailRecordDto } from './dto/mail-parking.dto';
import { MailRecord } from './entities/mail-record.entity';
import { Owner } from './entities/owner.entity';
import { Resident } from './entities/resident.entity';
import { ResidentialUnit } from './entities/residential-unit.entity';
import { Tenant } from './entities/tenant.entity';
import { ResidentialScopeService } from './residential-scope.service';

@Injectable()
export class ResidentialService {
  constructor(
    @InjectRepository(ResidentialUnit)
    private readonly unitsRepo: Repository<ResidentialUnit>,
    @InjectRepository(Resident)
    private readonly residentsRepo: Repository<Resident>,
    @InjectRepository(Owner)
    private readonly ownersRepo: Repository<Owner>,
    @InjectRepository(Tenant)
    private readonly tenantsRepo: Repository<Tenant>,
    @InjectRepository(MailRecord)
    private readonly mailRepo: Repository<MailRecord>,
    @InjectRepository(Post)
    private readonly postsRepo: Repository<Post>,
    private readonly scopeService: ResidentialScopeService,
    private readonly auditService: AuditService,
  ) {}

  async listUnits(user: JwtPayload) {
    const postIds = await this.scopeService.getPostIdsForUser(user);
    const qb = this.unitsRepo
      .createQueryBuilder('unit')
      .leftJoinAndSelect('unit.post', 'post')
      .orderBy('unit.created_at', 'DESC');

    this.scopeService.applyPostFilter(qb, 'unit', postIds);
    return qb.getMany();
  }

  async createUnit(dto: CreateResidentialUnitDto, user: JwtPayload) {
    const postIds = await this.scopeService.getPostIdsForUser(user);
    if (postIds !== null && !postIds.includes(dto.postId)) {
      throw new ForbiddenException('Sin acceso a este puesto');
    }

    const post = await this.postsRepo.findOne({ where: { id: dto.postId } });
    if (!post) {
      throw new NotFoundException('Puesto no encontrado');
    }

    const saved = await this.unitsRepo.save(this.unitsRepo.create(dto));

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'unit.create',
      entityType: 'residential_unit',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async updateUnit(id: string, dto: UpdateResidentialUnitDto, user: JwtPayload) {
    const unit = await this.scopeService.assertUnitAccess(id, user);
    const oldValue = { ...unit };
    Object.assign(unit, dto);
    const saved = await this.unitsRepo.save(unit);

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'unit.update',
      entityType: 'residential_unit',
      entityId: id,
      oldValue: oldValue as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async listResidents(unitId: string, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(unitId, user);
    return this.residentsRepo.find({
      where: { unitId },
      order: { createdAt: 'DESC' },
    });
  }

  async createResident(unitId: string, dto: CreateResidentDto, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(unitId, user);
    const saved = await this.residentsRepo.save(
      this.residentsRepo.create({ ...dto, unitId }),
    );

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'resident.create',
      entityType: 'resident',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async updateResident(
    unitId: string,
    id: string,
    dto: UpdateResidentDto,
    user: JwtPayload,
  ) {
    await this.scopeService.assertUnitAccess(unitId, user);
    const existing = await this.residentsRepo.findOne({ where: { id, unitId } });
    if (!existing) {
      throw new NotFoundException('Residente no encontrado');
    }

    const oldValue = { ...existing };
    Object.assign(existing, dto);
    const saved = await this.residentsRepo.save(existing);

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'resident.update',
      entityType: 'resident',
      entityId: id,
      oldValue: oldValue as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async listOwners(unitId: string, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(unitId, user);
    return this.ownersRepo.find({ where: { unitId }, order: { createdAt: 'DESC' } });
  }

  async createOwner(unitId: string, dto: CreatePersonDto, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(unitId, user);
    const saved = await this.ownersRepo.save(this.ownersRepo.create({ ...dto, unitId }));

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'owner.create',
      entityType: 'owner',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async updateOwner(unitId: string, id: string, dto: UpdatePersonDto, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(unitId, user);
    const existing = await this.ownersRepo.findOne({ where: { id, unitId } });
    if (!existing) {
      throw new NotFoundException('Propietario no encontrado');
    }

    const oldValue = { ...existing };
    Object.assign(existing, dto);
    const saved = await this.ownersRepo.save(existing);

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'owner.update',
      entityType: 'owner',
      entityId: id,
      oldValue: oldValue as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async listTenants(unitId: string, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(unitId, user);
    return this.tenantsRepo.find({ where: { unitId }, order: { createdAt: 'DESC' } });
  }

  async createTenant(unitId: string, dto: CreatePersonDto, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(unitId, user);
    const saved = await this.tenantsRepo.save(this.tenantsRepo.create({ ...dto, unitId }));

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'tenant.create',
      entityType: 'tenant',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async updateTenant(unitId: string, id: string, dto: UpdatePersonDto, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(unitId, user);
    const existing = await this.tenantsRepo.findOne({ where: { id, unitId } });
    if (!existing) {
      throw new NotFoundException('Arrendatario no encontrado');
    }

    const oldValue = { ...existing };
    Object.assign(existing, dto);
    const saved = await this.tenantsRepo.save(existing);

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'tenant.update',
      entityType: 'tenant',
      entityId: id,
      oldValue: oldValue as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async listMail(unitId: string, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(unitId, user);
    return this.mailRepo.find({ where: { unitId }, order: { receivedAt: 'DESC' } });
  }

  async createMail(unitId: string, dto: CreateMailRecordDto, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(unitId, user);
    const saved = await this.mailRepo.save(this.mailRepo.create({ ...dto, unitId }));

    await this.auditService.log({
      userId: user.sub,
      module: 'residential',
      action: 'mail.create',
      entityType: 'mail_record',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  async deliverMail(unitId: string, id: string, user: JwtPayload) {
    await this.scopeService.assertUnitAccess(unitId, user);
    const mail = await this.mailRepo.findOne({ where: { id, unitId } });
    if (!mail) {
      throw new NotFoundException('Correspondencia no encontrada');
    }

    if (mail.status === 'DELIVERED') {
      throw new ConflictException('La correspondencia ya fue entregada');
    }

    mail.status = 'DELIVERED';
    mail.deliveredAt = new Date();
    return this.mailRepo.save(mail);
  }
}
