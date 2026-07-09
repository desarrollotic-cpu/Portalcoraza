import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssociateHistory } from '../../associates/entities/associate-history.entity';
import { AuditService } from '../../audit/audit.service';

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

/**
 * Registro de auditoría campo-a-campo para el módulo Gestión Humana.
 *
 * Diferencia con `AuditService` genérico:
 *   • `AuditService` guarda un snapshot completo old/new como JSONB.
 *   • `HrAuditService` desglosa cambio a cambio en `associate_history`
 *     (útil para la bitácora personal del asociado y la vista tipo
 *     "quién cambió qué y cuándo").
 *
 * Cumple con la exigencia del repo de referencia (Coraza HRM):
 * bitácora detallada con valor anterior y valor nuevo por campo.
 */
@Injectable()
export class HrAuditService {
  constructor(
    @InjectRepository(AssociateHistory)
    private readonly historyRepo: Repository<AssociateHistory>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Registra una operación (CREATE/EDIT/DELETE/RETIRE/READMIT/…) sobre un
   * asociado. Guarda una fila global en `audit_logs` y una fila por campo
   * modificado en `associate_history`.
   */
  async recordAssociateChange(params: {
    userId: string | null;
    associateId: string;
    action: 'CREATE' | 'EDIT' | 'RETIRE' | 'READMIT' | 'IMPORT' | 'DELETE';
    oldValues: Record<string, unknown>;
    newValues: Record<string, unknown>;
    ipAddress?: string | null;
  }): Promise<void> {
    const { userId, associateId, action, oldValues, newValues, ipAddress } = params;

    await this.auditService.log({
      userId: userId ?? undefined,
      module: 'hr',
      action: action.toLowerCase(),
      entityType: 'associate',
      entityId: associateId,
      oldValue: oldValues as Record<string, unknown>,
      newValue: newValues as Record<string, unknown>,
    });

    const changes = this.diff(oldValues, newValues);
    if (changes.length === 0) return;

    const rows = changes.map((c) =>
      this.historyRepo.create({
        associateId,
        changedBy: userId,
        action,
        fieldName: c.field,
        oldValue: this.stringify(c.oldValue),
        newValue: this.stringify(c.newValue),
        ipAddress: ipAddress ?? null,
      }),
    );
    await this.historyRepo.save(rows);
  }

  private diff(
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
  ): FieldChange[] {
    const changes: FieldChange[] = [];
    for (const [field, newValue] of Object.entries(newValues)) {
      if (newValue === undefined) continue;
      const oldValue = oldValues?.[field];
      if (this.stringify(oldValue) !== this.stringify(newValue)) {
        changes.push({ field, oldValue, newValue });
      }
    }
    return changes;
  }

  private stringify(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }

  /** Bitácora global HRM (campo a campo) para la vista de auditoría. */
  async listRecent(limit = 100) {
    const capped = Math.min(Math.max(limit, 1), 500);
    return this.historyRepo.find({
      relations: ['associate', 'associate.jobPosition'],
      order: { createdAt: 'DESC' },
      take: capped,
    });
  }
}
