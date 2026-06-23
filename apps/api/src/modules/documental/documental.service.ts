import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateDocumentRecordDto } from './dto/create-document-record.dto';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentRecordDto } from './dto/update-document-record.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';
import { DocumentRecord } from './entities/document-record.entity';
import { DocumentType } from './entities/document-type.entity';

@Injectable()
export class DocumentalService {
  constructor(
    @InjectRepository(DocumentType)
    private readonly typesRepo: Repository<DocumentType>,
    @InjectRepository(DocumentRecord)
    private readonly recordsRepo: Repository<DocumentRecord>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  listTypes() {
    return this.typesRepo.find({ order: { createdAt: 'DESC' } });
  }

  async createType(dto: CreateDocumentTypeDto, userId: string) {
    const exists = await this.typesRepo.findOne({ where: { code: dto.code } });
    if (exists) {
      throw new ConflictException('Codigo de tipo documental ya existe');
    }

    const saved = await this.typesRepo.save(this.typesRepo.create(dto));
    await this.auditService.log({
      userId,
      module: 'documental',
      action: 'type.create',
      entityType: 'document_type',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });
    return saved;
  }

  async updateType(id: string, dto: UpdateDocumentTypeDto, userId: string) {
    const existing = await this.typesRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Tipo documental no encontrado');
    }

    const oldValue = { ...existing };
    Object.assign(existing, dto);
    const saved = await this.typesRepo.save(existing);

    await this.auditService.log({
      userId,
      module: 'documental',
      action: 'type.update',
      entityType: 'document_type',
      entityId: id,
      oldValue: oldValue as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }

  listRecords(code?: string) {
    return this.recordsRepo.find({
      where: code ? { code: ILike(`%${code}%`) } : {},
      relations: { documentType: true },
      order: { createdAt: 'DESC' },
    });
  }

  async createRecord(dto: CreateDocumentRecordDto, userId: string) {
    const type = await this.typesRepo.findOne({ where: { id: dto.documentTypeId } });
    if (!type) {
      throw new NotFoundException('Tipo documental no encontrado');
    }

    const exists = await this.recordsRepo.findOne({ where: { code: dto.code } });
    if (exists) {
      throw new ConflictException('Codigo de documento ya existe');
    }

    const saved = await this.recordsRepo.save(
      this.recordsRepo.create({
        ...dto,
        createdBy: userId,
        updatedBy: userId,
      }),
    );

    await this.auditService.log({
      userId,
      module: 'documental',
      action: 'record.create',
      entityType: 'document_record',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    await this.notificationsService.sendToRole(
      'GERENCIA',
      'Nuevo documento registrado',
      `${saved.code} — ${saved.title}`,
      'documental',
    );

    return saved;
  }

  async updateRecord(id: string, dto: UpdateDocumentRecordDto, userId: string) {
    const existing = await this.recordsRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Documento no encontrado');
    }

    if (dto.documentTypeId) {
      const type = await this.typesRepo.findOne({ where: { id: dto.documentTypeId } });
      if (!type) {
        throw new NotFoundException('Tipo documental no encontrado');
      }
    }

    const oldValue = { ...existing };
    Object.assign(existing, dto, { updatedBy: userId });
    const saved = await this.recordsRepo.save(existing);

    await this.auditService.log({
      userId,
      module: 'documental',
      action: 'record.update',
      entityType: 'document_record',
      entityId: id,
      oldValue: oldValue as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return saved;
  }
}
