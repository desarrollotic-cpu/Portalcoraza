import { DatePipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

export interface AuditMovementRow {
  id: string;
  userId: string | null;
  userName: string | null;
  module: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

interface MovementsResponse {
  items: AuditMovementRow[];
  total: number;
  page: number;
  limit: number;
}

const MODULE_LABELS: Record<string, string> = {
  auth: 'Acceso al portal',
  users: 'Usuarios del sistema',
  hr: 'Gestión humana',
  reception: 'Recepción',
  deliveries: 'Dotación',
  inventory: 'Almacén',
  post_equipment: 'Equipos de puesto',
  posts: 'Puestos de trabajo',
  scheduling: 'Programación',
  documental: 'Gestión documental',
  audit: 'Auditoría',
};

/** Textos en español para códigos de acción conocidos */
const ACTION_LABELS: Record<string, string> = {
  login: 'Inició sesión',
  logout: 'Cerró sesión',
  recover_admin: 'Recuperó acceso de administrador',
  change_password: 'Cambió su contraseña',
  reset_password: 'Restableció la contraseña de un usuario',
  create: 'Creó un registro',
  update: 'Actualizó un registro',
  delete: 'Eliminó un registro',
  toggle: 'Activó o desactivó un registro',
  register: 'Registró ingreso de visitante',
  exit: 'Registró salida de visitante',
  CREATE: 'Creó ficha de personal',
  EDIT: 'Editó ficha de personal',
  RETIRE: 'Dio de baja a un asociado',
  READMIT: 'Reingresó a un asociado',
  IMPORT: 'Importó datos de personal',
  DELETE: 'Eliminó un registro de personal',
  ALERTA: 'Generó o gestionó una alerta HR',
  view_record: 'Consultó una ficha',
  'delivery.create': 'Creó una entrega de dotación',
  'delivery.confirmed': 'Confirmó una entrega de dotación',
  'delivery.revert': 'Revirtió una entrega',
  'category.create': 'Creó categoría de inventario',
  'category.update': 'Actualizó categoría de inventario',
  'item.create': 'Ingresó un elemento al almacén',
  'item.update': 'Actualizó un elemento del almacén',
  'item.delete': 'Eliminó un elemento del almacén',
  'variant.create': 'Creó variante / talla',
  'variant.update': 'Actualizó variante / talla',
  'movement.create': 'Registró movimiento de inventario',
  'movement.transfer': 'Trasladó stock entre bodegas',
  'stock.low': 'Alerta de stock bajo',
  assign: 'Asignó equipo a puesto',
  return: 'Devolvió equipo de puesto',
  assign_unit: 'Asignó unidad de equipo',
  'schedule.create': 'Creó programación',
  'schedule.update': 'Actualizó programación',
  'schedule.delete': 'Eliminó programación',
  'monthly_schedule.create': 'Creó programación mensual',
  'monthly_schedule.save': 'Guardó programación mensual',
  'monthly_schedule.motor': 'Ejecutó motor de programación',
  'monthly_schedule.motor_global': 'Ejecutó motor global',
  'schedule_template.create': 'Creó plantilla de turnos',
  'loan.create': 'Solicitó préstamo documental',
  'loan.approve': 'Aprobó préstamo documental',
  'loan.reject': 'Rechazó préstamo documental',
  'loan.return': 'Registró devolución de préstamo',
  'loan.send_email_reminder': 'Envió recordatorio de préstamo',
  'type.create': 'Creó tipo documental',
  'type.update': 'Actualizó tipo documental',
  'record.create': 'Creó expediente / registro',
  'record.update': 'Actualizó expediente / registro',
  'contract.create': 'Creó contrato documental',
  'contract.update': 'Actualizó contrato documental',
  'minute.create': 'Creó acta',
  'minute.update': 'Actualizó acta',
  'library.folder.create': 'Creó carpeta en biblioteca',
  'library.file.create': 'Subió archivo a biblioteca',
  'library.file.delete': 'Eliminó archivo de biblioteca',
  'library.folder.delete': 'Eliminó carpeta de biblioteca',
  'workflow.resolve': 'Resolvió un flujo documental',
  'retired_personnel.create': 'Registró personal retirado (documental)',
  'retired_personnel.update_type': 'Actualizó personal retirado',
  'absence.create': 'Registró ausencia / incapacidad',
  'absence.update': 'Actualizó ausencia',
  'absence.delete': 'Eliminó ausencia',
  resolve_alert: 'Resolvió alerta de RRHH',
  run_alerts_cron: 'Ejecutó revisión de alertas',
  excel_import: 'Importó Excel de personal',
};

const ENTITY_LABELS: Record<string, string> = {
  user: 'Usuario',
  associate: 'Asociado',
  reception_visitor: 'Visitante',
  delivery: 'Entrega de dotación',
  inventory_item: 'Elemento de almacén',
  inventory_category: 'Categoría',
  inventory_variant: 'Variante / talla',
  inventory_movement: 'Movimiento de stock',
  post: 'Puesto',
  monthly_schedule: 'Programación mensual',
  schedule: 'Turno',
  loan: 'Préstamo documental',
  document_record: 'Expediente',
  job_position: 'Cargo',
  work_center: 'Centro de trabajo',
  hr_alert: 'Alerta RRHH',
  associate_absence: 'Ausencia',
};

function pickStr(obj: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!obj) return null;
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return null;
}

function humanAction(action: string): string {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  if (action.startsWith('loan.mail.')) return 'Envió correo de préstamo documental';
  if (action.startsWith('monthly_schedule.')) return `Programación mensual: ${action.replace('monthly_schedule.', '')}`;
  return action.replace(/[._]/g, ' ');
}

@Component({
  selector: 'app-admin-audit-movements',
  imports: [FormsModule, DatePipe],
  template: `
    <section class="mov">
      <header class="mov__head">
        <div>
          <h2>Historial de movimientos</h2>
          <p>
            Registro claro de lo que ocurre en el portal: quién hizo qué, en qué área y un resumen
            del cambio. Visible para Gerencia y Auditor.
          </p>
        </div>
      </header>

      <form class="mov__filters" (ngSubmit)="load(1)">
        <label>
          Área
          <select [(ngModel)]="filters.module" name="module">
            <option value="">Todas</option>
            @for (m of moduleOptions; track m.value) {
              <option [value]="m.value">{{ m.label }}</option>
            }
          </select>
        </label>
        <label>
          Buscar en la acción
          <input
            [(ngModel)]="filters.action"
            name="action"
            placeholder="Ej. login, visitante, entrega…"
          />
        </label>
        <label>
          Desde
          <input type="date" [(ngModel)]="filters.from" name="from" />
        </label>
        <label>
          Hasta
          <input type="date" [(ngModel)]="filters.to" name="to" />
        </label>
        <button type="submit" class="btn" [disabled]="loading()">Filtrar</button>
      </form>

      @if (error()) {
        <p class="mov__error">{{ error() }}</p>
      }

      <div class="mov__table-wrap">
        <table>
          <thead>
            <tr>
              <th>Cuándo</th>
              <th>Quién</th>
              <th>Área</th>
              <th>Qué hizo</th>
              <th>Resumen</th>
            </tr>
          </thead>
          <tbody>
            @if (loading()) {
              <tr>
                <td colspan="5" class="muted">Cargando…</td>
              </tr>
            } @else {
              @for (row of items(); track row.id) {
                <tr>
                  <td class="nowrap">{{ row.createdAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                  <td class="who">{{ row.userName || 'Sistema / sin usuario' }}</td>
                  <td>{{ moduleLabel(row.module) }}</td>
                  <td>
                    <span class="what">{{ actionLabel(row.action) }}</span>
                  </td>
                  <td class="summary">{{ summarize(row) }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="muted">Sin movimientos con estos filtros.</td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <footer class="mov__pager">
        <span class="muted">{{ total() }} movimiento(s)</span>
        <div>
          <button type="button" class="btn ghost" [disabled]="page() <= 1 || loading()" (click)="load(page() - 1)">
            Anterior
          </button>
          <span>Pág. {{ page() }}</span>
          <button
            type="button"
            class="btn ghost"
            [disabled]="page() * limit() >= total() || loading()"
            (click)="load(page() + 1)"
          >
            Siguiente
          </button>
        </div>
      </footer>
    </section>
  `,
  styles: `
    .mov { display: flex; flex-direction: column; gap: 1rem; }
    .mov__head h2 { margin: 0 0 0.25rem; font-size: 1.15rem; }
    .mov__head p { margin: 0; color: var(--text-muted, #6b7280); font-size: 0.9rem; max-width: 40rem; }
    .mov__filters {
      display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: flex-end;
    }
    .mov__filters label {
      display: flex; flex-direction: column; gap: 0.25rem;
      font-size: 0.75rem; color: var(--text-muted, #6b7280);
    }
    .mov__filters input, .mov__filters select {
      min-width: 9rem; padding: 0.4rem 0.55rem; border-radius: 8px;
      border: 1px solid var(--border, #e5e7eb); background: var(--surface, #fff);
    }
    .btn {
      padding: 0.45rem 0.9rem; border-radius: 8px; border: none;
      background: var(--coraza-primary, #1d4ed8); color: #fff; cursor: pointer; font-size: 0.875rem;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn.ghost {
      background: transparent; color: var(--text, #111); border: 1px solid var(--border, #e5e7eb);
    }
    .mov__error { color: var(--coraza-error, #b91c1c); margin: 0; }
    .mov__table-wrap { overflow: auto; border: 1px solid var(--border, #e5e7eb); border-radius: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { padding: 0.65rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border, #f3f4f6); vertical-align: top; }
    th { background: var(--surface-2, #f9fafb); font-weight: 600; white-space: nowrap; }
    .nowrap { white-space: nowrap; }
    .who { font-weight: 500; }
    .what { font-weight: 600; color: var(--coraza-primary, #1d4ed8); }
    .summary { color: var(--text-secondary, #374151); line-height: 1.35; max-width: 28rem; }
    .muted { color: var(--text-muted, #6b7280); }
    .mov__pager { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; }
    .mov__pager > div { display: flex; align-items: center; gap: 0.5rem; }
  `,
})
export class AdminAuditMovements implements OnInit {
  private readonly http = inject(HttpClient);

  readonly items = signal<AuditMovementRow[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly limit = signal(50);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  filters = { module: '', action: '', from: '', to: '' };

  readonly moduleOptions = Object.entries(MODULE_LABELS).map(([value, label]) => ({
    value,
    label,
  }));

  ngOnInit(): void {
    this.load(1);
  }

  moduleLabel(code: string): string {
    return MODULE_LABELS[code] || code;
  }

  actionLabel(action: string): string {
    return humanAction(action);
  }

  summarize(row: AuditMovementRow): string {
    const data = (row.newValue ?? row.oldValue) as Record<string, unknown> | null;
    const entity = row.entityType
      ? ENTITY_LABELS[row.entityType] || row.entityType.replace(/_/g, ' ')
      : null;

    const name =
      pickStr(data, [
        'fullName',
        'nombre',
        'name',
        'visitorName',
        'title',
        'email',
        'documentNumber',
        'code',
        'sku',
      ]) ||
      (data && typeof data['firstName'] === 'string'
        ? [data['firstName'], data['firstLastName']].filter(Boolean).join(' ')
        : null);

    const status = pickStr(data, ['status', 'estado']);
    const parts: string[] = [];

    if (entity) parts.push(entity);
    if (name) parts.push(name);
    if (status && !['login', 'logout'].includes(row.action)) {
      parts.push(`Estado: ${status}`);
    }

    if (row.action === 'login' || row.action === 'logout') {
      return name ? `Cuenta: ${name}` : 'Sesión en el portal';
    }

    if (row.module === 'reception' && data) {
      const visitor =
        pickStr(data, ['fullName', 'nombre', 'visitorName', 'name']) || name;
      const doc = pickStr(data, ['documentNumber', 'documento', 'document']);
      if (visitor || doc) {
        return [visitor, doc ? `Doc. ${doc}` : null].filter(Boolean).join(' · ');
      }
    }

    if (row.module === 'deliveries' && data) {
      const assoc = pickStr(data, ['associateName', 'fullName']);
      const items = data['items'];
      const n = Array.isArray(items) ? items.length : null;
      return [assoc, n != null ? `${n} ítem(s)` : null, status ? `Estado: ${status}` : null]
        .filter(Boolean)
        .join(' · ') || entity || 'Entrega de dotación';
    }

    if (parts.length) return parts.join(' · ');
    if (entity) return entity;
    return 'Sin más detalle';
  }

  load(page: number): void {
    this.loading.set(true);
    this.error.set(null);
    let params = new HttpParams()
      .set('page', String(page))
      .set('limit', String(this.limit()));
    if (this.filters.module) params = params.set('module', this.filters.module);
    if (this.filters.action.trim()) params = params.set('action', this.filters.action.trim());
    if (this.filters.from) params = params.set('from', this.filters.from);
    if (this.filters.to) params = params.set('to', this.filters.to);

    this.http
      .get<MovementsResponse>(`${environment.apiUrl}/audit/movements`, { params })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.total);
          this.page.set(res.page);
          this.limit.set(res.limit);
          this.loading.set(false);
        },
        error: () => {
          this.error.set('No se pudo cargar el historial.');
          this.loading.set(false);
        },
      });
  }
}
