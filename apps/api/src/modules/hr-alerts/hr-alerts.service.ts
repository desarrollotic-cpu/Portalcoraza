import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Associate, AssociateStatus } from '../associates/entities/associate.entity';
import { AuditService } from '../audit/audit.service';
import {
  AssociateDocument,
  AssociateDocumentKind,
} from '../hr-documents/entities/associate-document.entity';
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
    const today = new Date();

    // 1) Alertas de vencimiento por documento
    const documents = await this.documentsRepo
      .createQueryBuilder('d')
      .innerJoinAndSelect('d.associate', 'a')
      .where('d.expirationDate IS NOT NULL')
      .andWhere('a.status = :status', { status: AssociateStatus.ACTIVO })
      .getMany();

    // Solo tomar el documento más reciente por (associate, kind)
    const latestByKey = new Map<string, AssociateDocument>();
    for (const doc of documents) {
      const key = `${doc.associateId}:${doc.documentKind}`;
      const existing = latestByKey.get(key);
      if (!existing || existing.uploadedAt < doc.uploadedAt) {
        latestByKey.set(key, doc);
      }
    }

    for (const doc of latestByKey.values()) {
      const alertType = DOC_TO_ALERT[doc.documentKind];
      if (!alertType || !doc.expirationDate) continue;

      const expDate = new Date(doc.expirationDate);
      const daysToExpire = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      const trigger = THRESHOLDS_DAYS.find((t) => daysToExpire <= t && daysToExpire >= 0);
      const isOverdue = daysToExpire < 0;
      if (!trigger && !isOverdue) continue;

      const inserted = await this.upsertAlert(doc.associateId, alertType, doc.expirationDate);
      if (inserted) {
        summary.total += 1;
        summary[alertType] = (summary[alertType] ?? 0) + 1;
      }
    }

    // 2) Documentos faltantes en cargos críticos
    const critical = await this.associatesRepo
      .createQueryBuilder('a')
      .innerJoin('a.jobPosition', 'jp')
      .leftJoin(
        AssociateDocument,
        'd',
        'd.associateId = a.id AND d.documentKind = :kind',
        { kind: AssociateDocumentKind.CEDULA },
      )
      .where('jp.isCritical = true')
      .andWhere('a.status = :status', { status: AssociateStatus.ACTIVO })
      .andWhere('d.id IS NULL')
      .getMany();

    for (const assoc of critical) {
      const inserted = await this.upsertAlert(
        assoc.id,
        HrAlertType.DOCUMENTO_FALTANTE,
        today.toISOString().slice(0, 10),
      );
      if (inserted) {
        summary.total += 1;
        summary[HrAlertType.DOCUMENTO_FALTANTE] =
          (summary[HrAlertType.DOCUMENTO_FALTANTE] ?? 0) + 1;
      }
    }

    if (summary.total > 0) {
      await this.notifications.sendToRole(
        'SST',
        `${summary.total} nuevas alertas de vencimiento HRM`,
        'Revisa la matriz de cumplimiento',
        'hr',
      );
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

  /** Inserta una alerta si no existe otra idéntica en estado PENDIENTE. */
  private async upsertAlert(
    associateId: string,
    alertType: HrAlertType,
    expirationDate: string,
  ): Promise<boolean> {
    const existing = await this.alertsRepo.findOne({
      where: {
        associateId,
        alertType,
        expirationDate,
        status: HrAlertStatus.PENDIENTE,
      },
    });
    if (existing) return false;

    const alert = this.alertsRepo.create({
      associateId,
      alertType,
      expirationDate,
      status: HrAlertStatus.PENDIENTE,
    });
    await this.alertsRepo.save(alert);
    return true;
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
