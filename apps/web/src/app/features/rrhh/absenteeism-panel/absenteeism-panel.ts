import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideCalendarOff,
  LucidePlus,
  LucideTrash2,
  LucideUpload,
} from '@lucide/angular';
import { AuthService } from '../../../core/services/auth.service';
import { HrPageHeader } from '../../../shared/components/hr-page-header/hr-page-header';
import { Icon } from '../../../shared/components/icon/icon';
import { ToastService } from '../../../shared/services/toast.service';
import { HrApiService } from '../services/hr-api.service';
import type {
  AbsenteeismEventType,
  AbsenteeismKind,
  Associate,
  AssociateAbsence,
  AbsenceStats,
  CreateAbsencePayload,
  DiagnosisCie10,
} from '../services/hr.types';

/**
 * Panel de ausentismo (médico / administrativo) alineado a GESTION-HUMANA:
 * listado filtrable, KPIs, alta/edición, import Excel, búsqueda CIE-10.
 */
@Component({
  selector: 'app-absenteeism-panel',
  imports: [CommonModule, FormsModule, RouterLink, Icon, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header
        title="Ausentismo"
        subtitle="Incapacidades médicas y ausencias administrativas · paridad RRHH"
      >
        @if (auth.hasPermission('absences.import')) {
          <label actions class="hr-btn hr-btn-ghost" style="cursor: pointer">
            <app-icon [icon]="icons.Upload" [size]="16" />
            {{ importing() ? 'Importando...' : 'Importar Excel' }}
            <input
              type="file"
              accept=".xlsx,.xls"
              hidden
              [disabled]="importing()"
              (change)="onImport($event)"
            />
          </label>
        }
        @if (auth.hasPermission('absences.create')) {
          <button actions type="button" class="hr-btn hr-btn-primary" (click)="openCreate()">
            <app-icon [icon]="icons.Plus" [size]="16" /> Nueva ausencia
          </button>
        }
      </app-hr-page-header>

      @if (stats(); as s) {
        <section class="hr-summary" style="margin-bottom: 1rem">
          <div><span>Registros</span><strong>{{ s.total }}</strong></div>
          <div><span>Días totales</span><strong>{{ s.totalDays }}</strong></div>
          <div><span>Médicas</span><strong>{{ s.medical }}</strong></div>
          <div><span>Administrativas</span><strong>{{ s.admin }}</strong></div>
        </section>

        <div class="hr-grid-2" style="margin-bottom: 1.25rem">
          <div class="hr-detail-card">
            <h3>Por tipo de evento</h3>
            @if (eventBars().length === 0) {
              <p class="hr-empty">Sin datos aún.</p>
            } @else {
              @for (b of eventBars(); track b.label) {
                <div class="hr-bar-row">
                  <span>{{ b.label }}</span>
                  <div class="hr-bar-track"><div class="hr-bar-fill" [style.width.%]="b.pct"></div></div>
                  <strong>{{ b.value }}</strong>
                </div>
              }
            }
          </div>
          <div class="hr-detail-card">
            <h3>Días por origen (médico)</h3>
            @if (originBars().length === 0) {
              <p class="hr-empty">Sin datos médicos.</p>
            } @else {
              @for (b of originBars(); track b.label) {
                <div class="hr-bar-row">
                  <span>{{ b.label }}</span>
                  <div class="hr-bar-track"><div class="hr-bar-fill hr-bar-fill--amber" [style.width.%]="b.pct"></div></div>
                  <strong>{{ b.value }}</strong>
                </div>
              }
            }
          </div>
        </div>
      }

      <div class="hr-filters">
        <input
          type="search"
          placeholder="Buscar por cédula o nombre..."
          [(ngModel)]="search"
          (keyup.enter)="load()"
        />
        <select [(ngModel)]="kindFilter" (ngModelChange)="load()">
          <option [ngValue]="undefined">Todos los tipos</option>
          <option value="MEDICO">Médico</option>
          <option value="OTRO">Administrativo</option>
        </select>
        <input type="date" [(ngModel)]="from" />
        <input type="date" [(ngModel)]="to" />
        <button type="button" class="hr-btn hr-btn-ghost" (click)="load()">Filtrar</button>
      </div>

      @if (showForm()) {
        <form class="hr-detail-card hr-form" style="margin-bottom: 1.25rem" (ngSubmit)="save()">
          <h3>{{ editingId() ? 'Editar ausencia' : 'Nueva ausencia' }}</h3>
          <div class="hr-grid-2">
            <label>
              Asociado *
              @if (!editingId()) {
                <input
                  type="search"
                  placeholder="Cédula o nombre..."
                  [(ngModel)]="assocQuery"
                  name="assocQuery"
                  (input)="searchAssociates()"
                />
                @if (associateHits().length) {
                  <ul class="hr-suggest">
                    @for (a of associateHits(); track a.id) {
                      <li>
                        <button type="button" (click)="pickAssociate(a)">
                          {{ a.documentNumber }} · {{ a.fullName }}
                        </button>
                      </li>
                    }
                  </ul>
                }
                @if (form.associateId) {
                  <small class="hr-muted">Seleccionado: {{ selectedAssocLabel() }}</small>
                }
              } @else {
                <input type="text" [value]="selectedAssocLabel()" disabled />
              }
            </label>
            <label>
              Clase *
              <select [(ngModel)]="form.kind" name="kind" required>
                <option value="MEDICO">Médico</option>
                <option value="OTRO">Administrativo</option>
              </select>
            </label>
            <label>
              Evento *
              <select [(ngModel)]="form.eventType" name="eventType" required>
                @for (e of eventTypes; track e) {
                  <option [value]="e">{{ e }}</option>
                }
              </select>
            </label>
            <label>
              Inicio *
              <input type="date" [(ngModel)]="form.startDate" name="startDate" required />
            </label>
            <label>
              Fin *
              <input type="date" [(ngModel)]="form.endDate" name="endDate" required />
            </label>
            <label>
              Días
              <input type="number" min="0" [(ngModel)]="form.absenceDays" name="absenceDays" />
            </label>
            <label>
              Días en el mes
              <input type="number" min="0" [(ngModel)]="form.daysInMonth" name="daysInMonth" />
            </label>
            @if (form.kind === 'MEDICO') {
              <label>
                Origen incapacidad
                <input [(ngModel)]="form.incapacityOrigin" name="incapacityOrigin" placeholder="EG / AT / ..." />
              </label>
              <label>
                Diagnóstico CIE-10
                <input
                  type="search"
                  [(ngModel)]="diagQuery"
                  name="diagQuery"
                  placeholder="Código o descripción..."
                  (input)="searchDiagnoses()"
                />
                @if (diagHits().length) {
                  <ul class="hr-suggest">
                    @for (d of diagHits(); track d.id) {
                      <li>
                        <button type="button" (click)="pickDiagnosis(d)">
                          {{ d.codigo }} — {{ d.descripcion }}
                        </button>
                      </li>
                    }
                  </ul>
                }
                @if (form.diagnosisId) {
                  <small class="hr-muted">{{ selectedDiagLabel() }}</small>
                }
              </label>
              <label class="hr-check">
                <input type="checkbox" [(ngModel)]="form.isExtension" name="isExtension" />
                Prórroga
              </label>
              <label class="hr-check">
                <input type="checkbox" [(ngModel)]="form.postIncapacityExam" name="postIncapacityExam" />
                Examen post-incapacidad
              </label>
            }
            <label>
              Causa
              <input [(ngModel)]="form.cause" name="cause" />
            </label>
            <label>
              Observaciones
              <input [(ngModel)]="form.observations" name="observations" />
            </label>
          </div>
          <div class="hr-form-actions">
            <button type="button" class="hr-btn hr-btn-ghost" (click)="closeForm()">Cancelar</button>
            <button type="submit" class="hr-btn hr-btn-primary" [disabled]="saving() || !form.associateId">
              {{ saving() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      }

      @if (loading()) {
        <div class="hr-loading">Cargando ausencias...</div>
      } @else if (rows().length === 0) {
        <div class="hr-empty-state">
          <app-icon [icon]="icons.CalendarOff" [size]="40" />
          <p>Sin registros de ausentismo.</p>
        </div>
      } @else {
        <div class="hr-detail-card" style="overflow-x: auto">
          <table class="hr-table">
            <thead>
              <tr>
                <th>Asociado</th>
                <th>Clase</th>
                <th>Evento</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Días</th>
                <th>Diagnóstico / causa</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr>
                  <td>
                    @if (r.associate) {
                      <a [routerLink]="['/rrhh/asociados', r.associateId]" class="hr-link">
                        {{ r.associate.firstName }} {{ r.associate.firstLastName }}
                      </a>
                      <div class="hr-muted">{{ r.associate.documentNumber }}</div>
                    } @else {
                      {{ r.associateId }}
                    }
                  </td>
                  <td>
                    <span class="hr-status" [attr.data-color]="r.kind === 'MEDICO' ? 'amber' : 'gray'">
                      {{ r.kind === 'MEDICO' ? 'Médico' : 'Admin' }}
                    </span>
                  </td>
                  <td>{{ r.eventType }}</td>
                  <td>{{ r.startDate }}</td>
                  <td>{{ r.endDate }}</td>
                  <td>{{ r.absenceDays }}</td>
                  <td>
                    @if (r.diagnosis) {
                      <strong>{{ r.diagnosis.codigo }}</strong> {{ r.diagnosis.descripcion }}
                    } @else {
                      {{ r.cause || r.incapacityOrigin || '—' }}
                    }
                  </td>
                  <td class="row-actions">
                    @if (auth.hasPermission('absences.edit')) {
                      <button type="button" class="hr-link" (click)="openEdit(r)">Editar</button>
                    }
                    @if (auth.hasPermission('absences.delete')) {
                      <button type="button" class="hr-btn-danger-sm" (click)="remove(r)">
                        <app-icon [icon]="icons.Trash" [size]="14" />
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: `
    .hr-bar-row {
      display: grid;
      grid-template-columns: 4.5rem 1fr 2.5rem;
      gap: 0.5rem;
      align-items: center;
      margin: 0.4rem 0;
      font-size: 0.85rem;
    }
    .hr-bar-track {
      height: 0.55rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-border, #d4d4d4) 80%, transparent);
      overflow: hidden;
    }
    .hr-bar-fill {
      height: 100%;
      background: var(--color-primary, #1d4ed8);
      border-radius: inherit;
    }
    .hr-bar-fill--amber {
      background: #d97706;
    }
    .hr-suggest {
      list-style: none;
      margin: 0.25rem 0 0;
      padding: 0;
      border: 1px solid var(--color-border, #e5e5e5);
      border-radius: 0.5rem;
      max-height: 10rem;
      overflow: auto;
      background: var(--color-surface, #fff);
    }
    .hr-suggest button {
      display: block;
      width: 100%;
      text-align: left;
      padding: 0.45rem 0.65rem;
      border: 0;
      background: transparent;
      cursor: pointer;
      font: inherit;
    }
    .hr-suggest button:hover {
      background: color-mix(in srgb, var(--color-primary, #1d4ed8) 8%, transparent);
    }
    .hr-muted {
      color: var(--color-muted, #737373);
      font-size: 0.8rem;
    }
    .hr-check {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }
    .hr-form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1rem;
    }
  `,
})
export class AbsenteeismPanel implements OnInit {
  private readonly api = inject(HrApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly icons = {
    CalendarOff: LucideCalendarOff,
    Plus: LucidePlus,
    Trash: LucideTrash2,
    Upload: LucideUpload,
  };

  readonly eventTypes: AbsenteeismEventType[] = ['D.A.', 'S.P.', 'L.R.', 'L.N.R.', 'ACT'];

  readonly rows = signal<AssociateAbsence[]>([]);
  readonly stats = signal<AbsenceStats | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly importing = signal(false);
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly associateHits = signal<Associate[]>([]);
  readonly diagHits = signal<DiagnosisCie10[]>([]);

  search = '';
  kindFilter: AbsenteeismKind | undefined;
  from = '';
  to = '';
  assocQuery = '';
  diagQuery = '';
  private selectedAssociate: Associate | null = null;
  private selectedDiagnosis: DiagnosisCie10 | null = null;

  form: CreateAbsencePayload = this.emptyForm();

  readonly eventBars = computed(() => this.toBars(this.stats()?.byEvent ?? {}));
  readonly originBars = computed(() => this.toBars(this.stats()?.byOrigin ?? {}));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api
      .listAbsences({
        kind: this.kindFilter,
        search: this.search || undefined,
        from: this.from || undefined,
        to: this.to || undefined,
      })
      .subscribe({
        next: (rows) => {
          this.rows.set(rows);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toast.error('No se pudo cargar ausentismo');
        },
      });
    this.api.absenceStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => {},
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form = this.emptyForm();
    this.selectedAssociate = null;
    this.selectedDiagnosis = null;
    this.assocQuery = '';
    this.diagQuery = '';
    this.showForm.set(true);
  }

  openEdit(r: AssociateAbsence): void {
    this.editingId.set(r.id);
    this.selectedAssociate = r.associate ?? null;
    this.selectedDiagnosis = r.diagnosis ?? null;
    this.form = {
      associateId: r.associateId,
      kind: r.kind,
      eventType: r.eventType,
      startDate: r.startDate.slice(0, 10),
      endDate: r.endDate.slice(0, 10),
      absenceDays: r.absenceDays,
      daysInMonth: r.daysInMonth ?? undefined,
      isExtension: r.isExtension,
      postIncapacityExam: r.postIncapacityExam,
      incapacityOrigin: r.incapacityOrigin ?? undefined,
      diagnosisId: r.diagnosisId ?? undefined,
      cause: r.cause ?? undefined,
      observations: r.observations ?? undefined,
      baseSalary: r.baseSalary ?? undefined,
      atCosts: r.atCosts ?? undefined,
    };
    this.diagQuery = r.diagnosis ? `${r.diagnosis.codigo} — ${r.diagnosis.descripcion}` : '';
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  searchAssociates(): void {
    const q = this.assocQuery.trim();
    if (q.length < 2) {
      this.associateHits.set([]);
      return;
    }
    this.api.listAssociates({ search: q, status: 'ACTIVO' }).subscribe({
      next: (rows) => this.associateHits.set(rows.slice(0, 8)),
      error: () => this.associateHits.set([]),
    });
  }

  pickAssociate(a: Associate): void {
    this.selectedAssociate = a;
    this.form.associateId = a.id;
    this.assocQuery = `${a.documentNumber} · ${a.fullName}`;
    this.associateHits.set([]);
  }

  searchDiagnoses(): void {
    const q = this.diagQuery.trim();
    this.api.searchDiagnoses(q, 15).subscribe({
      next: (rows) => this.diagHits.set(rows),
      error: () => this.diagHits.set([]),
    });
  }

  pickDiagnosis(d: DiagnosisCie10): void {
    this.selectedDiagnosis = d;
    this.form.diagnosisId = d.id;
    this.diagQuery = `${d.codigo} — ${d.descripcion}`;
    this.diagHits.set([]);
  }

  selectedAssocLabel(): string {
    const a = this.selectedAssociate;
    return a ? `${a.documentNumber} · ${a.fullName}` : this.form.associateId;
  }

  selectedDiagLabel(): string {
    const d = this.selectedDiagnosis;
    return d ? `${d.codigo} — ${d.descripcion}` : '';
  }

  save(): void {
    if (!this.form.associateId || !this.form.startDate || !this.form.endDate) {
      this.toast.error('Completa asociado y fechas');
      return;
    }
    if (!this.form.absenceDays && this.form.absenceDays !== 0) {
      const start = new Date(this.form.startDate);
      const end = new Date(this.form.endDate);
      const days = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
      this.form.absenceDays = days;
    }

    this.saving.set(true);
    const id = this.editingId();
    const req = id
      ? this.api.updateAbsence(id, this.form)
      : this.api.createAbsence(this.form);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(id ? 'Ausencia actualizada' : 'Ausencia creada');
        this.closeForm();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.toast.error('No se pudo guardar', err.error?.message ?? '');
      },
    });
  }

  remove(r: AssociateAbsence): void {
    if (!confirm('¿Eliminar este registro de ausencia?')) return;
    this.api.deleteAbsence(r.id).subscribe({
      next: () => {
        this.toast.info('Ausencia eliminada');
        this.load();
      },
      error: () => this.toast.error('No se pudo eliminar'),
    });
  }

  onImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.importing.set(true);
    this.api.importAbsencesExcel(file).subscribe({
      next: (report) => {
        this.importing.set(false);
        input.value = '';
        this.toast.success(
          'Importación lista',
          `Médicas: ${report.medicalCreated} · Admin: ${report.otherCreated} · CIE-10: ${report.diagnosesUpserted}` +
            (report.errors.length ? ` · avisos: ${report.errors.length}` : ''),
        );
        this.load();
      },
      error: (err) => {
        this.importing.set(false);
        input.value = '';
        this.toast.error('Importación fallida', err.error?.message ?? '');
      },
    });
  }

  private emptyForm(): CreateAbsencePayload {
    return {
      associateId: '',
      kind: 'MEDICO',
      eventType: 'D.A.',
      startDate: '',
      endDate: '',
      absenceDays: undefined,
      daysInMonth: undefined,
      isExtension: false,
      postIncapacityExam: false,
      incapacityOrigin: '',
      diagnosisId: undefined,
      cause: '',
      observations: '',
    };
  }

  private toBars(map: Record<string, number>): { label: string; value: number; pct: number }[] {
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const max = entries[0]?.[1] ?? 0;
    return entries.map(([label, value]) => ({
      label,
      value,
      pct: max ? Math.max(8, (value / max) * 100) : 0,
    }));
  }
}
