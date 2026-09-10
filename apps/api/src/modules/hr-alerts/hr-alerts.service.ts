import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Associate, AssociateStatus } from '../associates/entities/associate.entity';
import { AuditService } from '../audit/audit.service';
import {
  AssociateDocument,
  AssociateDocumentKind,
} from '../hr-documents/entities/associate-document.entity';
import { HrAuditService } from '../hr-shared/services/hr-audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { HrAlert, HrAlertStatus, HrAlertType } from './entities/hr-alert.entity';

/** Umbrales en días para disparar alerta (más lejano → más cercano). */
const THRESHOLDS_DAYS = [60, 30, 7];

/**
 * Mapea el tipo de documento a su tipo de alerta correspondiente. Si el
 * documento no genera alertas, retorna null.
 */
const DOC_TO_ALERT: Partial<Record<AssociateDocumentKind, HrAlertType>> = {
  [AssociateDocumentKind.CERTIFICADO_CURSO]: HrAlertType.VENCIMIENTO_CURSO,
  [AssociateDocumentKind.OTRO]: HrAlertType.VENCIMIENTO_CURSO,
  [AssociateDocumentKind.EXAMEN_PSICOFISICO]: HrAlertType.VENCIMIENTO_PSICOFISICO,
  [AssociateDocumentKind.EXAMEN_PSICOSENSOMETRICO]: HrAlertType.VENCIMIENTO_PSICOSENSOMETRICO,
  [AssociateDocumentKind.POLIZA_SURA]: HrAlertType.VENCIMIENTO_POLIZA,
};

/**
 * Motor de alertas HRM. Genera alertas de vencimiento (60, 30, 7 días antes)
 * para cursos, exámenes psicofísicos, psicosensométricos y pólizas SURA.
 * También detecta documentos faltantes en asociados con cargos críticos.
 *
 * Idempotente: usa un unique index parcial en (associateId, alertType,
 * expirationDate) WHERE status = 'PENDIENTE'. Si al ejecutarse ya existe la
 * alerta, se ignora el INSERT.
 */
@Injectable()
export class HrAlertsService {
  constructor(
    @InjectRepository(HrAlert)
    private readonly alertsRepo: Repository<HrAlert>,
    @InjectRepository(Associate)
    private readonly associatesRepo: Repository<Associate>,
    @InjectRepository(AssociateDocument)
    private readonly documentsRepo: Repository<AssociateDocument>,
    private readonly audit: AuditService,
    private readonly hrAudit: HrAuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(filters: { status?: HrAlertStatus; associateId?: string; alertType?: HrAlertType }) {
    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.associateId) where.associateId = filters.associateId;
    if (filters.alertType) where.alertType = filters.alertType;
    return this.alertsRepo.find({
      where,
      relations: ['associate', 'associate.jobPosition', 'associate.workCenter'],
      order: { expirationDate: 'ASC' },
    });
  }

  async findByAssociate(associateId: string) {
    await this.syncAssociate(associateId);
    return this.alertsRepo.find({
      where: { associateId },
      order: { generatedAt: 'DESC' },
    });
  }

  async resolve(id: string, userId: string, notes?: string) {
    const alert = await this.alertsRepo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException('Alerta no encontrada');

    alert.status = HrAlertStatus.RESUELTA;
    alert.resolvedBy = userId;
    alert.resolvedAt = new Date();
    if (notes) alert.notes = notes;
    await this.alertsRepo.save(alert);

    await this.audit.log({
      userId,
      module: 'hr',
      action: 'resolve_alert',
      entityType: 'hr_alert',
      entityId: id,
      newValue: { status: HrAlertStatus.RESUELTA, notes: notes ?? null },
    });

    return alert;
  }

  /**
   * Genera todas las alertas pendientes recorriendo asociados activos + sus
   * documentos con fecha de vencimiento. Se ejecuta desde el cron diario o
   * manualmente por un usuario con `hr_alerts.run_cron`.
   *
   * Retorna un resumen con cuántas alertas se crearon por tipo.
   */
  async generateAll(userId?: string) {
    const summary: Record<string, number> = { total: 0 };
    const activos = await this.associatesRepo.find({
      where: { status: AssociateStatus.ACTIVO },
      select: ['id'],
    });
    for (const assoc of activos) {
      summary.total += await this.syncAssociate(assoc.id);
    }

    if (summary.total > 0) {
      await this.notifications.sendToRole('RRHH', `${summary.total} nuevas alertas HRM`, null, 'hr');
    }

    if (userId) {
      await this.audit.log({
        userId,
        module: 'hr',
        action: 'run_alerts_cron',
        entityType: 'hr_alert',
        entityId: 'batch',
        newValue: summary,
      });
    }

    return summary;
  }

  /**
   * Recalcula alertas de un asociado: documentos vencidos/por vencer
   * y exámenes SST en rojo (faltantes).
   */
  async syncAssociate(associateId: string): Promise<number> {
    const associate = await this.associatesRepo.findOne({ where: { id: associateId } });
    if (!associate || associate.status !== AssociateStatus.ACTIVO) return 0;

    const docs = await this.documentsRepo.find({
      where: { associateId },
      order: { uploadedAt: 'DESC' },
    });
    const latest = new Map<AssociateDocumentKind, AssociateDocument>();
    for (const doc of docs) {
      if (!latest.has(doc.documentKind)) latest.set(doc.documentKind, doc);
    }

    let created = 0;
    for (const doc of latest.values()) {
      if (await this.syncFromDocument(doc)) created += 1;
    }

    const today = new Date().toISOString().slice(0, 10);
    const psycho = latest.get(AssociateDocumentKind.EXAMEN_PSICOFISICO);
    const psicos = latest.get(AssociateDocumentKind.EXAMEN_PSICOSENSOMETRICO);
    const course = latest.get(AssociateDocumentKind.CERTIFICADO_CURSO);

    if (!associate.psychophysicalValid && !psycho?.expirationDate) {
      if (
        await this.upsertAlert(
          associateId,
          HrAlertType.VENCIMIENTO_PSICOFISICO,
          today,
          'Falta',
        )
      ) {
        created += 1;
      }
    }
    if (!associate.psychosensometricValid && !psicos?.expirationDate) {
      if (
        await this.upsertAlert(
          associateId,
          HrAlertType.VENCIMIENTO_PSICOSENSOMETRICO,
          today,
          'Falta',
        )
      ) {
        created += 1;
      }
    }
    const hasCourseRef = !!(associate.courseCode || associate.courseCertificateNumber);
    if (hasCourseRef && !course?.expirationDate) {
      if (
        await this.upsertAlert(
          associateId,
          HrAlertType.VENCIMIENTO_CURSO,
          today,
          'Falta',
        )
      ) {
        created += 1;
      }
    }

    return created;
  }

  /** Crea alerta si el documento vence en 60/30/7 días o ya venció. */
  async syncFromDocument(doc: AssociateDocument): Promise<boolean> {
    const alertType = DOC_TO_ALERT[doc.documentKind];
    if (!alertType || !doc.expirationDate) return false;

    const today = new Date();
    const expDate = new Date(doc.expirationDate);
    const daysToExpire = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const trigger = THRESHOLDS_DAYS.find((t) => daysToExpire <= t && daysToExpire >= 0);
    const isOverdue = daysToExpire < 0;
    if (!trigger && !isOverdue) return false;

    const inserted = await this.upsertAlert(
      doc.associateId,
      alertType,
      this.asDateStr(doc.expirationDate),
    );
    if (isOverdue) {
      if (doc.documentKind === AssociateDocumentKind.EXAMEN_PSICOFISICO) {
        await this.associatesRepo.update({ id: doc.associateId }, { psychophysicalValid: false });
      } else if (doc.documentKind === AssociateDocumentKind.EXAMEN_PSICOSENSOMETRICO) {
        await this.associatesRepo.update({ id: doc.associateId }, { psychosensometricValid: false });
      }
    }
    return inserted;
  }

  /** Inserta una alerta si no existe otra idéntica en estado PENDIENTE. */
  private async upsertAlert(
    associateId: string,
    alertType: HrAlertType,
    expirationDate: string,
    notes?: string,
  ): Promise<boolean> {
    const exp = this.asDateStr(expirationDate);
    const existing = await this.alertsRepo.findOne({
      where: {
        associateId,
        alertType,
        status: HrAlertStatus.PENDIENTE,
      },
    });
    if (existing) {
      const wasMissing =
        existing.notes === 'Falta' || (existing.notes ?? '').includes('faltante');
      if (
        existing.expirationDate !== exp ||
        (notes && existing.notes !== notes) ||
        (wasMissing && notes !== 'Falta')
      ) {
        existing.expirationDate = exp;
        if (notes) existing.notes = notes;
        else if (wasMissing) existing.notes = null;
        await this.alertsRepo.save(existing);
      }
      return false;
    }

    const alert = this.alertsRepo.create({
      associateId,
      alertType,
      expirationDate: exp,
      status: HrAlertStatus.PENDIENTE,
      notes: notes ?? null,
    });
    await this.alertsRepo.save(alert);
    await this.hrAudit.recordSstAlert(associateId, alertType, notes === 'Falta' ? null : exp);
    return true;
  }

  private asDateStr(value: string | Date): string {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  /** Cierra alertas vencidas de asociados que dejaron de estar ACTIVOS. */
  async cleanupStale() {
    return this.alertsRepo
      .createQueryBuilder()
      .update()
      .set({ status: HrAlertStatus.RESUELTA, resolvedAt: new Date(), notes: 'auto-cerrada por cambio de estado' })
      .where('status = :status', { status: HrAlertStatus.PENDIENTE })
      .andWhere(
        `associateId IN (SELECT id FROM associates WHERE status IN ('RETIRADO','INACTIVO','SUSPENDIDO'))`,
      )
      .execute();
  }

  /** Estadística agregada rápida para el dashboard HRM. */
  async summary() {
    const [pending, resolved] = await Promise.all([
      this.alertsRepo.count({ where: { status: HrAlertStatus.PENDIENTE } }),
      this.alertsRepo.count({ where: { status: HrAlertStatus.RESUELTA } }),
    ]);
    return { pending, resolved };
  }
}
