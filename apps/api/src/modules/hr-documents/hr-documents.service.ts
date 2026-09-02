import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { SupabaseStorageService } from '../../common/services/supabase-storage.service';
import { Associate } from '../associates/entities/associate.entity';
import { AuditService } from '../audit/audit.service';
import { HrAlert, HrAlertStatus, HrAlertType } from '../hr-alerts/entities/hr-alert.entity';
import { HrAlertsService } from '../hr-alerts/hr-alerts.service';
import { AssociateCredentialDto, UploadDocumentDto } from './dto/upload-document.dto';
import {
  AssociateDocument,
  AssociateDocumentKind,
} from './entities/associate-document.entity';

const BUCKET = 'hr-documents';
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);

const DOC_TO_ALERT: Partial<Record<AssociateDocumentKind, HrAlertType>> = {
  [AssociateDocumentKind.CERTIFICADO_CURSO]: HrAlertType.VENCIMIENTO_CURSO,
  [AssociateDocumentKind.OTRO]: HrAlertType.VENCIMIENTO_CURSO,
  [AssociateDocumentKind.EXAMEN_PSICOFISICO]: HrAlertType.VENCIMIENTO_PSICOFISICO,
  [AssociateDocumentKind.EXAMEN_PSICOSENSOMETRICO]: HrAlertType.VENCIMIENTO_PSICOSENSOMETRICO,
  [AssociateDocumentKind.POLIZA_SURA]: HrAlertType.VENCIMIENTO_POLIZA,
};

/**
 * Gestión de documentos del asociado (cédulas, certificados de curso,
 * exámenes psicofísicos, psicosensométricos, pólizas SURA, contratos, actas).
 *
 * Archivos:
 *   • Bucket público `hr-documents` en Supabase Storage.
 *   • Path: `{associateId}/{documentKind}/{uuid}-{originalName}` para permitir
 *     múltiples versiones por asociado y tipo.
 *   • Máximo 15 MB por archivo; solo PDF e imágenes comunes.
 */
@Injectable()
export class HrDocumentsService {
  constructor(
    @InjectRepository(AssociateDocument)
    private readonly documentsRepo: Repository<AssociateDocument>,
    @InjectRepository(Associate)
    private readonly associatesRepo: Repository<Associate>,
    @InjectRepository(HrAlert)
    private readonly alertsRepo: Repository<HrAlert>,
    private readonly storage: SupabaseStorageService,
    private readonly audit: AuditService,
    private readonly alerts: HrAlertsService,
  ) {}

  async list(associateId: string, kind?: AssociateDocumentKind) {
    const where: Record<string, unknown> = { associateId };
    if (kind) where.documentKind = kind;
    return this.documentsRepo.find({
      where,
      order: { uploadedAt: 'DESC' },
    });
  }

  async findOne(id: string) {
    const doc = await this.documentsRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  async upload(
    associateId: string,
    file: Express.Multer.File,
    dto: UploadDocumentDto,
    userId: string,
  ) {
    if (!file) throw new BadRequestException('Archivo requerido');
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`El archivo excede el límite de ${MAX_FILE_SIZE / 1024 / 1024} MB.`);
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido (${file.mimetype}). Solo PDF e imágenes.`,
      );
    }

    const associate = await this.associatesRepo.findOne({ where: { id: associateId } });
    if (!associate) throw new NotFoundException('Asociado no encontrado');

    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${associateId}/${dto.documentKind}/${randomUUID()}-${safeName}`;

    const publicUrl = await this.storage.uploadPublicObject(
      BUCKET,
      filePath,
      file.buffer,
      file.mimetype,
    );

    const record = this.documentsRepo.create({
      associateId,
      documentKind: dto.documentKind,
      fileUrl: publicUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      issuedDate: dto.issuedDate ?? null,
      expirationDate: dto.expirationDate ?? null,
      notes: dto.notes ?? null,
      uploadedBy: userId,
    });
    const saved = await this.documentsRepo.save(record);

    await this.audit.log({
      userId,
      module: 'hr',
      action: 'upload_document',
      entityType: 'associate_document',
      entityId: saved.id,
      newValue: {
        associateId,
        documentKind: dto.documentKind,
        fileName: file.originalname,
      },
    });

    // Actualizar flags del asociado según el tipo de documento
    await this.refreshValidityFlags(associateId);

    // Resolver alertas pendientes del mismo tipo (paridad GESTION-HUMANA)
    const alertType = DOC_TO_ALERT[dto.documentKind];
    if (alertType) {
      await this.alertsRepo.update(
        {
          associateId,
          alertType,
          status: HrAlertStatus.PENDIENTE,
        },
        {
          status: HrAlertStatus.RESUELTA,
          resolvedAt: new Date(),
          resolvedBy: userId,
        },
      );
    }

    await this.alerts.syncFromDocument(saved);
    return saved;
  }

  async registerCredentials(
    associateId: string,
    items: AssociateCredentialDto[],
    userId: string,
  ) {
    const associate = await this.associatesRepo.findOne({ where: { id: associateId } });
    if (!associate) throw new NotFoundException('Asociado no encontrado');

    for (const item of items) {
      const existing = await this.documentsRepo.findOne({
        where: { associateId, documentKind: item.documentKind },
        order: { uploadedAt: 'DESC' },
      });
      const saved = existing
        ? await this.documentsRepo.save({
            ...existing,
            issuedDate: item.issuedDate ?? existing.issuedDate,
            expirationDate: item.expirationDate,
            notes: item.notes?.trim() || existing.notes,
          })
        : await this.documentsRepo.save(
            this.documentsRepo.create({
              associateId,
              documentKind: item.documentKind,
              fileUrl: null,
              fileName: item.notes?.trim() || null,
              issuedDate: item.issuedDate ?? null,
              expirationDate: item.expirationDate,
              notes: item.notes?.trim() || null,
              uploadedBy: userId,
            }),
          );
      await this.alerts.syncFromDocument(saved);
    }
    await this.refreshValidityFlags(associateId);
  }

  async remove(id: string, userId: string) {
    const doc = await this.findOne(id);
    const filePath = doc.fileUrl ? this.storage.extractFilePath(doc.fileUrl, BUCKET) : null;
    if (filePath) {
      try {
        await this.storage.deleteObject(BUCKET, filePath);
      } catch (err) {
        // Silenciar: mejor borrar la fila aunque el archivo remoto ya no exista.
        console.warn('[HrDocumentsService] Error al borrar archivo remoto:', err);
      }
    }
    await this.documentsRepo.delete(id);

    await this.audit.log({
      userId,
      module: 'hr',
      action: 'delete_document',
      entityType: 'associate_document',
      entityId: id,
      oldValue: {
        associateId: doc.associateId,
        documentKind: doc.documentKind,
      },
    });

    await this.refreshValidityFlags(doc.associateId);
    return { ok: true };
  }

  /**
   * Recalcula los flags `psychophysicalValid`, `psychosensometricValid` y
   * `hasSuraPolicy` del asociado con base en la fecha de vencimiento del
   * documento más reciente de cada tipo.
   */
  private async refreshValidityFlags(associateId: string) {
    const docs = await this.documentsRepo.find({
      where: { associateId },
      order: { uploadedAt: 'DESC' },
    });

    const latestOf = (kind: AssociateDocumentKind) => docs.find((d) => d.documentKind === kind);
    const isValid = (kind: AssociateDocumentKind): boolean => {
      const d = latestOf(kind);
      if (!d) return false;
      if (!d.expirationDate) return true;
      return new Date(d.expirationDate) >= new Date();
    };

    await this.associatesRepo.update(
      { id: associateId },
      {
        psychophysicalValid: isValid(AssociateDocumentKind.EXAMEN_PSICOFISICO),
        psychosensometricValid: isValid(AssociateDocumentKind.EXAMEN_PSICOSENSOMETRICO),
        hasSuraPolicy: isValid(AssociateDocumentKind.POLIZA_SURA),
      },
    );
  }
}
