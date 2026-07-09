import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideAlertTriangle,
  LucideCalendarClock,
  LucideDoorOpen,
  LucideUserCheck,
  LucideUserPlus,
} from '@lucide/angular';
import { AuthService } from '../../../core/services/auth.service';
import { Icon } from '../../../shared/components/icon/icon';
import { HrApiService } from '../services/hr-api.service';
import type { DashboardOverview } from '../services/hr.types';

@Component({
  selector: 'app-hr-dashboard',
  imports: [CommonModule, RouterLink, Icon],
  template: `
    <div class="hr-dashboard">
      @if (loading()) {
        <div class="hr-dash-skeleton-grid">
          @for (i of [0,1,2,3]; track i) {
            <div class="hr-dash-skel-card"></div>
          }
        </div>
      } @else if (error()) {
        <div class="hr-dash-error">{{ error() }}</div>
      } @else if (data(); as d) {
        <section class="hr-dash-kpi-grid">
          @if (auth.hasPermission('associates.view')) {
            <a routerLink="/rrhh/asociados" [queryParams]="{ status: 'ACTIVO' }" class="hr-dash-kpi hr-dash-kpi--primary">
              <div class="hr-dash-kpi__icon"><app-icon [icon]="icons.UserCheck" [size]="22" /></div>
              <div class="hr-dash-kpi__body">
                <span class="hr-dash-kpi__label">Activos</span>
                <strong class="hr-dash-kpi__value">{{ d.counts.ACTIVO }}</strong>
                <span class="hr-dash-kpi__hint">Plantilla vigente</span>
              </div>
            </a>
          } @else {
            <div class="hr-dash-kpi hr-dash-kpi--primary">
              <div class="hr-dash-kpi__icon"><app-icon [icon]="icons.UserCheck" [size]="22" /></div>
              <div class="hr-dash-kpi__body">
                <span class="hr-dash-kpi__label">Activos</span>
                <strong class="hr-dash-kpi__value">{{ d.counts.ACTIVO }}</strong>
                <span class="hr-dash-kpi__hint">Plantilla vigente</span>
              </div>
            </div>
          }
          <div class="hr-dash-kpi">
            <div class="hr-dash-kpi__icon hr-dash-kpi__icon--amber"><app-icon [icon]="icons.CalendarClock" [size]="22" /></div>
            <div class="hr-dash-kpi__body">
              <span class="hr-dash-kpi__label">Vacaciones</span>
              <strong class="hr-dash-kpi__value">{{ d.counts.VACACIONES }}</strong>
              <span class="hr-dash-kpi__hint">Ausencia planificada</span>
            </div>
          </div>
          <div class="hr-dash-kpi">
            <div class="hr-dash-kpi__icon hr-dash-kpi__icon--rose"><app-icon [icon]="icons.DoorOpen" [size]="22" /></div>
            <div class="hr-dash-kpi__body">
              <span class="hr-dash-kpi__label">Retirados</span>
              <strong class="hr-dash-kpi__value">{{ d.counts.RETIRADO }}</strong>
              <span class="hr-dash-kpi__hint">Histórico total</span>
            </div>
          </div>
          @if (auth.hasPermission('hr_alerts.view')) {
            <a routerLink="/rrhh/alertas" class="hr-dash-kpi">
              <div class="hr-dash-kpi__icon hr-dash-kpi__icon--alert"><app-icon [icon]="icons.Alert" [size]="22" /></div>
              <div class="hr-dash-kpi__body">
                <span class="hr-dash-kpi__label">Suspendidos</span>
                <strong class="hr-dash-kpi__value">{{ d.counts.SUSPENDIDO }}</strong>
                <span class="hr-dash-kpi__hint">Requieren revisión</span>
              </div>
            </a>
          } @else {
            <div class="hr-dash-kpi">
              <div class="hr-dash-kpi__icon hr-dash-kpi__icon--alert"><app-icon [icon]="icons.Alert" [size]="22" /></div>
              <div class="hr-dash-kpi__body">
                <span class="hr-dash-kpi__label">Suspendidos</span>
                <strong class="hr-dash-kpi__value">{{ d.counts.SUSPENDIDO }}</strong>
                <span class="hr-dash-kpi__hint">Requieren revisión</span>
              </div>
            </div>
          }
          @if (auth.hasPermission('associates.create')) {
            <a routerLink="/rrhh/asociados/nuevo" class="hr-dash-kpi hr-dash-kpi--cta">
              <div class="hr-dash-kpi__icon"><app-icon [icon]="icons.UserPlus" [size]="22" /></div>
              <div class="hr-dash-kpi__body">
                <span class="hr-dash-kpi__label">Nuevo asociado</span>
                <strong class="hr-dash-kpi__value">+</strong>
                <span class="hr-dash-kpi__hint">Registrar hoja de vida</span>
              </div>
            </a>
          }
        </section>

        <section class="hr-dash-panel">
          <header class="hr-dash-panel__head">
            <h2>Rotación últimos 6 meses</h2>
            <span class="hr-dash-panel__hint">Retiros / plantilla activa promedio</span>
          </header>
          <div class="hr-dash-rotation">
            @for (m of d.rotation; track m.key) {
              <div class="hr-dash-bar-col">
                <div class="hr-dash-bar-track">
                  <div
                    class="hr-dash-bar-fill"
                    [style.height.%]="rotationBarHeight(m.rate)"
                    [attr.title]="m.retirements + ' retiros / ' + m.activeAtEnd + ' activos'"
                  ></div>
                </div>
                <span class="hr-dash-bar-label">{{ m.key.substring(5) }}</span>
                <span class="hr-dash-bar-value">{{ m.rate }}%</span>
              </div>
            }
          </div>
        </section>

        <div class="hr-dash-two-col">
          <section class="hr-dash-panel">
            <header class="hr-dash-panel__head">
              <h2>Distribución por EPS</h2>
              <span class="hr-dash-panel__hint">Plantilla activa</span>
            </header>
            <ul class="hr-dash-ranked">
              @for (item of d.demographics.byEps; track item.label) {
                <li>
                  <span class="hr-dash-ranked__label">{{ item.label }}</span>
                  <div class="hr-dash-ranked__bar">
                    <div class="hr-dash-ranked__fill" [style.width.%]="pctOf(item.total, epsMax())"></div>
                  </div>
                  <span class="hr-dash-ranked__value">{{ item.total }}</span>
                </li>
              } @empty {
                <li class="empty">Sin datos aún</li>
              }
            </ul>
          </section>

          <section class="hr-dash-panel">
            <header class="hr-dash-panel__head">
              <h2>Buckets de edad</h2>
              <span class="hr-dash-panel__hint">Personal activo</span>
            </header>
            <ul class="hr-dash-ranked">
              @for (bucket of d.demographics.byAgeBucket; track bucket.label) {
                <li>
                  <span class="hr-dash-ranked__label">{{ bucket.label }}</span>
                  <div class="hr-dash-ranked__bar">
                    <div class="hr-dash-ranked__fill" [style.width.%]="pctOf(bucket.total, ageMax())"></div>
                  </div>
                  <span class="hr-dash-ranked__value">{{ bucket.total }}</span>
                </li>
              }
            </ul>
          </section>
        </div>

        <div class="hr-dash-two-col">
          <section class="hr-dash-panel">
            <header class="hr-dash-panel__head">
              <h2>Top motivos de retiro</h2>
              <span class="hr-dash-panel__hint">Últimos 12 meses</span>
            </header>
            <ul class="hr-dash-ranked">
              @for (item of d.retirementReasons; track item.label) {
                <li>
                  <span class="hr-dash-ranked__label">{{ item.label }}</span>
                  <div class="hr-dash-ranked__bar">
                    <div class="hr-dash-ranked__fill hr-dash-ranked__fill--danger" [style.width.%]="pctOf(item.total, reasonsMax())"></div>
                  </div>
                  <span class="hr-dash-ranked__value">{{ item.total }}</span>
                </li>
              } @empty {
                <li class="empty">Sin retiros registrados en el periodo</li>
              }
            </ul>
          </section>

          <section class="hr-dash-panel">
            <header class="hr-dash-panel__head">
              <h2>Top cargos</h2>
              <span class="hr-dash-panel__hint">Plantilla activa</span>
            </header>
            <ul class="hr-dash-ranked">
              @for (item of d.positions; track item.label) {
                <li>
                  <span class="hr-dash-ranked__label">
                    {{ item.label }}
                    @if (item.isCritical) {
                      <span class="hr-pill-critical">crítico</span>
                    }
                  </span>
                  <div class="hr-dash-ranked__bar">
                    <div class="hr-dash-ranked__fill" [style.width.%]="pctOf(item.total, positionsMax())"></div>
                  </div>
                  <span class="hr-dash-ranked__value">{{ item.total }}</span>
                </li>
              }
            </ul>
          </section>
        </div>

        <section class="hr-dash-panel">
          <header class="hr-dash-panel__head">
            <h2>Distribución por centro de trabajo</h2>
            <span class="hr-dash-panel__hint">Plantilla activa</span>
          </header>
          <div class="hr-dash-wc-grid">
            @for (wc of d.workCenters; track wc.code) {
              <div class="hr-dash-wc-card">
                <div class="hr-code-badge">{{ wc.code }}</div>
                <div class="hr-dash-wc-name">{{ wc.label }}</div>
                <div class="hr-dash-wc-total">{{ wc.total }} personas</div>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class HrDashboard implements OnInit {
  private readonly api = inject(HrApiService);
  readonly auth = inject(AuthService);

  readonly icons = {
    UserCheck: LucideUserCheck,
    CalendarClock: LucideCalendarClock,
    DoorOpen: LucideDoorOpen,
    Alert: LucideAlertTriangle,
    UserPlus: LucideUserPlus,
  };

  readonly data = signal<DashboardOverview | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly epsMax = computed(() =>
    Math.max(1, ...(this.data()?.demographics.byEps.map((r) => r.total) ?? [1])),
  );
  readonly ageMax = computed(() =>
    Math.max(1, ...(this.data()?.demographics.byAgeBucket.map((r) => r.total) ?? [1])),
  );
  readonly reasonsMax = computed(() =>
    Math.max(1, ...(this.data()?.retirementReasons.map((r) => r.total) ?? [1])),
  );
  readonly positionsMax = computed(() =>
    Math.max(1, ...(this.data()?.positions.map((r) => r.total) ?? [1])),
  );

  ngOnInit(): void {
    this.api.dashboardOverview().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err.status === 403 ? 'Sin permiso para ver el panel' : 'Error cargando el panel');
      },
    });
  }

  pctOf(value: number, max: number): number {
    if (!max) return 0;
    return Math.max(2, Math.round((value / max) * 100));
  }

  rotationBarHeight(rate: number): number {
    const maxRate = Math.max(1, ...(this.data()?.rotation.map((r) => r.rate) ?? [1]));
    return Math.max(4, Math.round((rate / maxRate) * 90));
  }
}
