import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideBell, LucideCircleCheck, LucidePlay } from '@lucide/angular';
import { AuthService } from '../../../core/services/auth.service';
import { HrPageHeader } from '../../../shared/components/hr-page-header/hr-page-header';
import { Icon } from '../../../shared/components/icon/icon';
import { ToastService } from '../../../shared/services/toast.service';
import { HrApiService } from '../services/hr-api.service';
import type { HrAlert, HrAlertStatus, HrAlertType } from '../services/hr.types';

const ALERT_TYPE_LABEL: Record<HrAlertType, string> = {
  VENCIMIENTO_CURSO: 'Curso de reentrenamiento',
  VENCIMIENTO_PSICOFISICO: 'Examen psicofísico',
  VENCIMIENTO_PSICOSENSOMETRICO: 'Examen psicosensométrico',
  VENCIMIENTO_POLIZA: 'Póliza SURA',
  DOCUMENTO_FALTANTE: 'Documento faltante',
};

/**
 * Panel de alertas HRM. Muestra las alertas generadas por el motor de cron
 * (60/30/7 días antes de vencer), permite filtrar por estado y tipo, y
 * ofrece a los roles autorizados ejecutar el cron manualmente y resolver
 * alertas individualmente.
 */
@Component({
  selector: 'app-alerts-panel',
  imports: [CommonModule, FormsModule, RouterLink, Icon, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header
        title="Alertas de vencimiento"
        subtitle="Motor automático diario · umbrales 60 / 30 / 7 días"
      >
        @if (auth.hasPermission('hr_alerts.run_cron')) {
          <button
            actions
            type="button"
            class="hr-btn hr-btn-primary"
            [disabled]="running()"
            (click)="runCron()"
          >
            <app-icon [icon]="icons.Play" [size]="16" />
            {{ running() ? 'Ejecutando...' : 'Ejecutar motor ahora' }}
          </button>
        }
      </app-hr-page-header>

      <div class="hr-filters">
        <div class="hr-chips">
          <button type="button" class="hr-chip" [class.active]="statusFilter === 'PENDIENTE'" (click)="setStatus('PENDIENTE')">
            Pendientes ({{ pendingCount() }})
          </button>
          <button type="button" class="hr-chip" [class.active]="statusFilter === 'RESUELTA'" (click)="setStatus('RESUELTA')">
            Resueltas ({{ resolvedCount() }})
          </button>
          <button type="button" class="hr-chip" [class.active]="!statusFilter" (click)="setStatus(undefined)">Todas</button>
        </div>
        <select [(ngModel)]="typeFilter" (ngModelChange)="load()">
          <option [ngValue]="undefined">Cualquier tipo</option>
          @for (t of alertTypes; track t.value) {
            <option [ngValue]="t.value">{{ t.label }}</option>
          }
        </select>
      </div>

      @if (loading()) {
        <div class="hr-loading">Cargando alertas...</div>
      } @else if (filtered().length === 0) {
        <div class="hr-empty-state">
          <app-icon [icon]="icons.Bell" [size]="40" />
          <p>Sin alertas activas. ¡Todo al día!</p>
        </div>
      } @else {
        <ul class="hr-alert-list">
          @for (a of filtered(); track a.id) {
            <li
              class="hr-alert-item"
              [class.resolved]="a.status === 'RESUELTA'"
              [attr.data-severity]="severityFor(a) === 'critical' ? 'high' : severityFor(a) === 'high' ? 'medium' : 'low'"
            >
              <div>
                <div class="hr-alert-item__type">{{ typeLabel(a.alertType) }}</div>
                <div class="hr-alert-item__meta">
                  @if (a.associate) {
                    <a [routerLink]="['/rrhh/asociados', a.associateId]" class="hr-link">
                      {{ a.associate.firstName }} {{ a.associate.firstLastName }}
                    </a>
                    · {{ a.associate.documentNumber }}
                  } @else {
                    Asociado {{ a.associateId }}
                  }
                </div>
                <div class="hr-alert-item__dates">
                  Vence: <strong>{{ a.expirationDate }}</strong> · {{ daysToExpire(a) }}
                </div>
              </div>
              @if (a.status === 'PENDIENTE' && auth.hasPermission('hr_alerts.resolve')) {
                <button type="button" class="hr-btn-resolve" (click)="resolve(a.id)">
                  <app-icon [icon]="icons.Check" [size]="14" /> Resolver
                </button>
              } @else if (a.status === 'RESUELTA') {
                <span class="hr-resolved-tag">Resuelta {{ a.resolvedAt | date:'shortDate' }}</span>
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class AlertsPanel implements OnInit {
  private readonly api = inject(HrApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly icons = { Bell: LucideBell, Check: LucideCircleCheck, Play: LucidePlay };
  readonly alertTypes = Object.entries(ALERT_TYPE_LABEL).map(([value, label]) => ({
    value: value as HrAlertType,
    label,
  }));

  readonly alerts = signal<HrAlert[]>([]);
  readonly loading = signal(true);
  readonly running = signal(false);

  statusFilter: HrAlertStatus | undefined = 'PENDIENTE';
  typeFilter: HrAlertType | undefined;

  readonly filtered = computed(() => this.alerts());
  readonly pendingCount = computed(() => this.alerts().filter((a) => a.status === 'PENDIENTE').length);
  readonly resolvedCount = computed(() => this.alerts().filter((a) => a.status === 'RESUELTA').length);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.listAlerts({ status: this.statusFilter, alertType: this.typeFilter }).subscribe({
      next: (rows) => {
        this.alerts.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  setStatus(status: HrAlertStatus | undefined): void {
    this.statusFilter = status;
    this.load();
  }

  resolve(id: string): void {
    this.api.resolveAlert(id).subscribe({ next: () => this.load() });
  }

  runCron(): void {
    this.running.set(true);
    this.api.runAlerts().subscribe({
      next: () => {
        this.running.set(false);
        this.load();
      },
      error: () => this.running.set(false),
    });
  }

  typeLabel(t: HrAlertType): string {
    return ALERT_TYPE_LABEL[t];
  }

  daysToExpire(a: HrAlert): string {
    const days = Math.ceil(
      (new Date(a.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (days < 0) return `vencido hace ${-days} días`;
    if (days === 0) return 'vence hoy';
    return `en ${days} días`;
  }

  severityFor(a: HrAlert): 'critical' | 'high' | 'normal' {
    const days = Math.ceil(
      (new Date(a.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (days < 0 || days <= 7) return 'critical';
    if (days <= 30) return 'high';
    return 'normal';
  }
}
