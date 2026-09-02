import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { DeliveryHistory } from '../../dotacion/delivery-history/delivery-history';
import { Associate, AssociatesApiService } from '../../rrhh/associates-api.service';
import { SchedulingApiService } from '../scheduling-api.service';
import {
  BoardAlertsResponse,
  Jornada,
  MonthlySchedule,
  MonthlySchedulingApiService,
  PersonalRole,
  SavePayload,
  ScheduleAlertItem,
  ScheduleAssignment,
  ScheduleTemplate,
  Turno,
} from '../monthly-scheduling-api.service';
import { getColombiaHolidays, isColombiaHoliday } from '../utils/colombia-holidays';

interface CodeConfig {
  codigo: string;
  label: string;
  jornada: Jornada;
  turno: Turno | null;
  inicio: string | null;
  fin: string | null;
  cssClass: string;
}

interface CellState {
  associateId: string | null;
  jornada: Jornada;
  codigo: string | null;
  turno: Turno | null;
  inicio: string | null;
  fin: string | null;
}

const CODES: CodeConfig[] = [
  { codigo: 'D', label: 'D — Diurno 12h (06–18)', jornada: 'normal', turno: 'AM', inicio: '06:00', fin: '18:00', cssClass: 'c-d' },
  { codigo: 'N', label: 'N — Nocturno 12h (18–06)', jornada: 'normal', turno: 'PM', inicio: '18:00', fin: '06:00', cssClass: 'c-n' },
  { codigo: 'D8', label: 'D8 — Diurno 8h (06–14)', jornada: 'normal', turno: 'AM', inicio: '06:00', fin: '14:00', cssClass: 'c-d8' },
  { codigo: 'N8', label: 'N8 — Nocturno 8h (22–06)', jornada: 'normal', turno: 'PM', inicio: '22:00', fin: '06:00', cssClass: 'c-n8' },
  { codigo: 'DR', label: 'DR — Descanso remunerado', jornada: 'descanso_remunerado', turno: null, inicio: null, fin: null, cssClass: 'c-dr' },
  { codigo: 'NR', label: 'NR — Descanso no remunerado', jornada: 'descanso_no_remunerado', turno: null, inicio: null, fin: null, cssClass: 'c-nr' },
  { codigo: 'VAC', label: 'VAC — Vacaciones', jornada: 'vacacion', turno: null, inicio: null, fin: null, cssClass: 'c-vac' },
  { codigo: 'LC', label: 'LC — Licencia', jornada: 'licencia', turno: null, inicio: null, fin: null, cssClass: 'c-lc' },
  { codigo: 'IN', label: 'IN — Incapacidad', jornada: 'incapacidad', turno: null, inicio: null, fin: null, cssClass: 'c-in' },
  { codigo: 'SP', label: 'SP — Suspensión', jornada: 'suspension', turno: null, inicio: null, fin: null, cssClass: 'c-sp' },
  { codigo: 'AC', label: 'AC — Accidente', jornada: 'accidente', turno: null, inicio: null, fin: null, cssClass: 'c-ac' },
];

@Component({
  selector: 'app-schedule-board',
  imports: [FormsModule, DeliveryHistory, ConfirmDialog],
  template: `
    <section>
      <header class="toolbar">
        <div class="toolbar-controls">
          <div class="post-nav-group">
            <label>
              Puesto
              <div class="post-select-row">
                <button type="button" class="btn-nav" (click)="prevPost()" [disabled]="!canPrevPost()" title="Puesto anterior">◀</button>
                <div class="post-autocomplete-wrap">
                  <input
                    type="text"
                    [ngModel]="postSearchQuery()"
                    (ngModelChange)="onPostSearchChange($event)"
                    (focus)="postDropdownOpen.set(true)"
                    placeholder=" Escribe nombre de puesto (ej: 808, Navarra, Interclub...)"
                    class="inp-post-combobox"
                  />
                  @if (postSearchQuery()) {
                    <button type="button" class="btn-clear-post-search" (click)="clearPostSearch()"></button>
                  }
                  @if (postDropdownOpen()) {
                    <div class="dropdown-backdrop" (click)="postDropdownOpen.set(false)"></div>
                    <div class="post-dropdown-panel" (click)="$event.stopPropagation()">
                      @for (p of filteredPosts().slice(0, 35); track p.id) {
                        <div
                          class="post-dropdown-item"
                          [class.selected]="p.id === postId"
                          (click)="selectPost(p)"
                        >
                          <strong>{{ p.name }}</strong>
                        </div>
                      } @empty {
                        <div class="post-dropdown-empty">No se encontraron puestos con "{{ postSearchQuery() }}"</div>
                      }
                    </div>
                  }
                </div>
                <button type="button" class="btn-nav" (click)="nextPost()" [disabled]="!canNextPost()" title="Puesto siguiente">▶</button>
              </div>
            </label>
            @if (postId && currentPostIndex() >= 0) {
              <span class="post-counter">Puesto {{ currentPostIndex() + 1 }} de {{ posts().length }}</span>
            }
          </div>

          <label>
            Mes
            <input type="month" [(ngModel)]="month" (ngModelChange)="onSelectionChange()" />
          </label>
          <label>
            Ciclo
            <select [(ngModel)]="tipoCiclo">
              <option value="12x3">12×3 (6D-6N-3Desc)</option>
              <option value="10x5">10×5 (5D-5N-5Desc)</option>
              <option value="2x2">2×2 (2D-2N-2NR)</option>
              <option value="13x2">13×2 (13D-2R-13N-2R)</option>
            </select>
          </label>
          @if (schedule()) {
            <span class="status" [class]="'st-' + schedule()!.status">{{ statusLabel() }}</span>
          }
        </div>
      </header>

      @if (error()) {
        <div class="banner error-banner" style="background:#fee2e2; border:1px solid #fca5a5; color:#991b1b; padding:0.65rem 1rem; border-radius:8px; margin-bottom:1rem; display:flex; justify-content:space-between; align-items:center;">
          <span> {{ error() }}</span>
          <button type="button" class="ghost" style="padding:0.25rem 0.6rem; font-size:0.75rem;" (click)="onSelectionChange()">Reintentar</button>
        </div>
      }
      @if (motorOk()) {
        <div class="banner motor-ok-banner">{{ motorOk() }}</div>
      }

      @if (loading()) {
        <p>Cargando programación…</p>
      } @else if (!postId) {
        <p>Selecciona un puesto y un mes para empezar.</p>
      } @else if (!schedule()) {
        <div class="empty-state">
          <p>No existe programación para este puesto en {{ monthLabel() }}.</p>
          <button type="button" class="primary" (click)="createSchedule()" [disabled]="saving()">
            Crear programación
          </button>
          <button type="button" (click)="runMotor()" [disabled]="saving()">
            Crear y aplicar motor ({{ tipoCiclo }})
          </button>
        </div>
      } @else {
        <div class="actions">
          <button type="button" (click)="runMotor()" [disabled]="saving()">
            Aplicar motor ({{ tipoCiclo }})
          </button>
          <button type="button" (click)="saveAsTemplate()" [disabled]="saving()">
            Guardar plantilla
          </button>
          @if (templates().length) {
            <label class="tpl">
              Plantilla
              <select [(ngModel)]="selectedTemplateId">
                <option value="">—</option>
                @for (t of templates(); track t.id) {
                  <option [value]="t.id">{{ t.name }}</option>
                }
              </select>
            </label>
            <button
              type="button"
              (click)="applySelectedTemplate()"
              [disabled]="saving() || !selectedTemplateId"
            >
              Aplicar plantilla
            </button>
          }
          <button type="button" class="primary" (click)="save()" [disabled]="saving() || !dirty()">
            Guardar
          </button>
          @if (schedule()!.status !== 'publicado') {
            <button type="button" class="success" (click)="setStatus('publicado')" [disabled]="saving() || dirty()">
               Publicar Malla Oficial
            </button>
          } @else {
            <button type="button" (click)="setStatus('borrador')" [disabled]="saving()">
              Volver a borrador
            </button>
          }
          <button type="button" class="btn-print" (click)="printPlanillaCartelera()" [disabled]="saving()">
             Imprimir Planilla Cartelera
          </button>
          @if (dirty()) {
            <span class="hint warn">Hay cambios sin guardar</span>
          }
        </div>

        <div class="roles-panel">
          <h3>Personal / Roles</h3>
          <div class="roles-grid">
            @for (role of personal(); track role.rol; let i = $index) {
              <div class="role-row">
                <input
                  class="role-name"
                  type="text"
                  [ngModel]="role.displayName"
                  (ngModelChange)="updateRoleName(i, $event)"
                  placeholder="Nombre del rol"
                />
                <div class="titular-autocomplete-wrap">
                  <input
                    type="text"
                    class="inp-search-assoc"
                    [ngModel]="titularInputValue(i, role.associateId)"
                    (ngModelChange)="onTitularSearchChange(i, $event)"
                    (focus)="openTitularPicker(i)"
                    placeholder="Buscar vigilante (nombre o cédula)…"
                  />
                  @if (titularPickerIndex() === i && titularPickerQuery().trim().length >= 2) {
                    <div class="search-results-list titular-dropdown">
                      <div
                        class="assoc-option"
                        [class.selected]="!role.associateId"
                        (click)="selectTitular(i, null)"
                      >
                        Sin titular
                      </div>
                      @for (a of filteredPickerAssociates().slice(0, 40); track a.id) {
                        <div
                          class="assoc-option"
                          [class.selected]="role.associateId === a.id"
                          (click)="selectTitular(i, a.id)"
                        >
                          <div class="assoc-name">{{ associateName(a) }}</div>
                          <div class="assoc-cc">CC: {{ a.documentNumber }}</div>
                        </div>
                      } @empty {
                        <div class="assoc-no-results">Sin coincidencias</div>
                      }
                    </div>
                  }
                </div>
                <button type="button" class="danger sm" (click)="removeRole(i)"></button>
              </div>
            }
          </div>
          <button type="button" class="sm" (click)="addRole()">+ Agregar rol</button>
        </div>

        <!-- BARRA DE AUTO-LLENADO INTELIGENTE DE TURNOS -->
        <div class="quick-pattern-bar">
          <div class="qpb-header">
            <span class="qpb-title"> Auto-Llenado Inteligente por Patrón (1 Clic):</span>
            <span class="qpb-hint">Llena el mes completo automáticamente evitando digitación manual celda por celda</span>
          </div>
          <div class="qpb-controls">
            <label class="qpb-field">
              Rol a llenar:
              <select #patternRoleSelect>
                <option value="ALL"> Todos los roles</option>
                @for (r of personal(); track r.rol) {
                  <option [value]="r.rol">{{ r.displayName || r.rol }}</option>
                }
              </select>
            </label>
            <label class="qpb-field">
              Patrón de Rotación:
              <select #patternCodeSelect>
                <option value="2x2x2">Patrón 2x2x2 (2D, 2N, 2DR)</option>
                <option value="2x2x2_N">Patrón 2x2x2 Invertido (2N, 2D, 2DR)</option>
                <option value="6x1_D">Patrón 6x1 Diurno (6D, 1DR)</option>
                <option value="6x1_N">Patrón 6x1 Nocturno (6N, 1DR)</option>
                <option value="4x2">Patrón 4x2 (4D, 2DR)</option>
                <option value="D_ALL">12h Diurno Continuo (D todos los días)</option>
                <option value="N_ALL">12h Nocturno Continuo (N todos los días)</option>
                <option value="D8_L_V">5x2 Oficina Lunes a Viernes 8h (D8)</option>
              </select>
            </label>
            <label class="qpb-field">
              Desde el día:
              <select #patternStartDaySelect>
                @for (day of days(); track day) {
                  <option [value]="day">Día {{ day }}</option>
                }
              </select>
            </label>
            <button
              type="button"
              class="btn-apply-pattern"
              (click)="applyCustomPattern(patternRoleSelect.value, patternCodeSelect.value, +patternStartDaySelect.value)"
              [disabled]="saving() || !personal().length"
            >
               Poblar Mes Automáticamente
            </button>
          </div>
        </div>

        <div class="matrix-wrap">
          <table class="matrix">
            <thead>
              <tr>
                <th class="sticky-col">Rol / Titular</th>
                @for (day of days(); track day) {
                  <th
                    [class.col-sunday]="isSunday(day)"
                    [class.col-saturday]="isSaturday(day)"
                    [class.col-holiday]="isHoliday(day)"
                    [title]="dayTooltip(day)"
                  >
                    <div class="day-dow">{{ dayOfWeekLetter(day) }}</div>
                    <div class="day-num">{{ day }}</div>
                    @if (isHoliday(day)) {
                      <span class="hol-star" [title]="holidayName(day)"></span>
                    }
                  </th>
                }
                <th class="summary-th" title="Días Laborados">Días</th>
                <th class="summary-th" title="Turnos Diurnos">D</th>
                <th class="summary-th" title="Turnos Nocturnos">N</th>
                <th class="summary-th" title="Total Horas Liquidables">Horas</th>
              </tr>
            </thead>
            <tbody>
              @for (role of personal(); track role.rol) {
                <tr>
                  <td class="sticky-col">
                    <div class="role-label">{{ role.displayName || role.rol }}</div>
                    <div class="role-titular">{{ titularName(role) }}</div>
                  </td>
                  @for (day of days(); track day) {
                    <td
                      class="cell"
                      [class]="cellClass(role.rol, day)"
                      [class.col-sunday]="isSunday(day)"
                      [class.col-saturday]="isSaturday(day)"
                      [class.col-holiday]="isHoliday(day)"
                      (click)="openCell(role, day)"
                      [title]="cellTitle(role.rol, day)"
                    >
                      {{ cellLabel(role.rol, day) }}
                    </td>
                  }
                  <td class="summary-td">{{ getGuardMetrics(role.rol).dias }}</td>
                  <td class="summary-td diurno-td">{{ getGuardMetrics(role.rol).turnosD }}</td>
                  <td class="summary-td nocturno-td">{{ getGuardMetrics(role.rol).turnosN }}</td>
                  <td class="summary-td hours-td" [class.hours-over]="getGuardMetrics(role.rol).totalHoras > 240">
                    <strong>{{ getGuardMetrics(role.rol).totalHoras }}h</strong>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td [attr.colspan]="days().length + 5">Agrega al menos un rol.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="calendar-indicators">
          <span class="ind-pill ind-sun">
            <span class="ind-box sun-bg">D / </span>
            <strong>Domingos y Festivos de Colombia</strong>
          </span>
          <span class="ind-pill ind-sat">
            <span class="ind-box sat-bg">S</span>
            <strong>Sábados</strong>
          </span>
          <span class="ind-pill ind-week">
            <span class="ind-box week-bg">L–V</span>
            <span>Días hábiles</span>
          </span>
        </div>

        <div class="legend">
          @for (c of codes; track c.codigo) {
            <span class="badge" [class]="c.cssClass">{{ c.codigo }}</span>
          }
          <span class="hint">Clic en una celda para editarla</span>
        </div>
      }

      @if (postId && auth.hasPermission('deliveries.view')) {
        <app-delivery-history
          [postId]="postId"
          title="Entregas de dotación al puesto"
        />
      }

      @if (editing()) {
        <div class="modal-backdrop" (click)="closeCell()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>Editar celda</h3>
            <p class="modal-sub">{{ editing()!.roleName }} — Día {{ editing()!.day }}</p>

            <div class="assoc-search-box">
              <label class="assoc-label">
                <span>Vigilante / Asociado</span>
                <div class="current-assoc-badge">
                  <span> {{ selectedAssociateLabel() }}</span>
                  @if (editAssociateId) {
                    <button type="button" class="btn-clear-assoc" (click)="editAssociateId = null" title="Quitar asignación"></button>
                  }
                </div>
              </label>

              <div class="search-input-wrap">
                <input
                  type="text"
                  [ngModel]="associateSearchQuery()"
                  (ngModelChange)="associateSearchQuery.set($event)"
                  placeholder="Nombre completo o cédula (mín. 2 caracteres)…"
                  class="inp-search-assoc"
                />
                @if (associateSearchQuery().trim().length > 0 && associateSearchQuery().trim().length < 2) {
                  <p class="assoc-hint">Escribe al menos 2 caracteres para buscar entre los vigilantes.</p>
                }
                @if (associateSearchQuery()) {
                  <button type="button" class="btn-clear-search" (click)="associateSearchQuery.set('')"></button>
                }
              </div>

              @if (associateSearchQuery().trim().length >= 2) {
                <div class="search-results-list">
                  <div
                    class="assoc-option"
                    [class.selected]="editAssociateId === null"
                    (click)="editAssociateId = null; associateSearchQuery.set('')"
                  >
                    — Sin asignar / Titular por defecto —
                  </div>
                  @for (a of filteredAssociates().slice(0, 40); track a.id) {
                    <div
                      class="assoc-option"
                      [class.selected]="editAssociateId === a.id"
                      (click)="editAssociateId = a.id; associateSearchQuery.set('')"
                    >
                      <div class="assoc-name">{{ associateName(a) }}</div>
                      <div class="assoc-cc">CC: {{ a.documentNumber }}</div>
                    </div>
                  } @empty {
                    <div class="assoc-no-results">No se encontraron vigilantes con "{{ associateSearchQuery() }}"</div>
                  }
                </div>
              }
            </div>

            <label>
              Código / estado
              <select [(ngModel)]="editCodigo" (ngModelChange)="onEditCodigoChange($event)">
                <option value="">Sin asignar</option>
                @for (c of codes; track c.codigo) {
                  <option [value]="c.codigo">{{ c.label }}</option>
                }
              </select>
            </label>

            <!-- BOTONERA DE ACCESO RÁPIDO Y NOVEDADES EN 1 CLIC -->
            <div class="quick-novelty-bar">
              <span class="quick-label"> Acceso Rápido / Novedad (1 Clic):</span>
              <div class="quick-btns">
                <button type="button" class="btn-q c-d" (click)="quickSelectCode('D')"> D (12h)</button>
                <button type="button" class="btn-q c-n" (click)="quickSelectCode('N')"> N (12h)</button>
                <button type="button" class="btn-q c-d8" (click)="quickSelectCode('D8')"> D8 (8h)</button>
                <button type="button" class="btn-q c-n8" (click)="quickSelectCode('N8')"> N8 (8h)</button>
                <button type="button" class="btn-q c-dr" (click)="quickSelectCode('DR')"> Descanso</button>
                <button type="button" class="btn-q c-vac" (click)="quickSelectCode('VAC')"> Vacaciones</button>
                <button type="button" class="btn-q c-in" (click)="quickSelectCode('IN')"> Incapacidad</button>
                <button type="button" class="btn-q c-lc" (click)="quickSelectCode('LC')"> Licencia</button>
              </div>
            </div>

            <!-- AJUSTE DE HORARIO Y NOVEDADES (HORA ENTRADA / SALIDA) -->
            @if (showTimeInputs()) {
              <div class="time-range-box">
                <div class="time-range-row">
                  <label class="time-label">
                    Hora Entrada
                    <input type="time" [(ngModel)]="editInicio" class="inp-time" />
                  </label>
                  <label class="time-label">
                    Hora Salida
                    <input type="time" [(ngModel)]="editFin" class="inp-time" />
                  </label>
                </div>
                @if (calculatedHoursText()) {
                  <div class="hours-badge">
                    ⏱ {{ calculatedHoursText() }}
                  </div>
                }
              </div>
            }

            <div class="modal-actions">
              <button type="button" (click)="closeCell()">Cancelar</button>
              <button type="button" class="danger" (click)="clearCell()">Vaciar</button>
              <button type="button" class="primary" (click)="applyCell()">Aplicar</button>
            </div>
          </div>
        </div>
      }

      <app-confirm-dialog
        [open]="confirmOpen()"
        [title]="confirmTitle()"
        [message]="confirmMessage()"
        [detail]="confirmDetail()"
        confirmLabel="Programar igual"
        cancelLabel="Cancelar"
        [busy]="saving()"
        (confirmed)="onConfirmOk()"
        (cancelled)="onConfirmCancel()"
      />
    </section>
  `,
  styles: `
    header h2 { margin: 0; color: var(--primary-dark); font-weight: 600; }
    header p { color: var(--coraza-text-muted); margin: 0.25rem 0 1rem; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 1rem; align-items: end; margin-bottom: 1rem; }
    .toolbar-controls { display: flex; flex-wrap: wrap; gap: 1rem; align-items: end; width: 100%; }
    
    .post-nav-group { display: flex; flex-direction: column; gap: 0.25rem; }
    .post-select-row { display: flex; align-items: center; gap: 0.35rem; }
    .btn-nav {
      padding: 0.45rem 0.65rem;
      background: #0f172a;
      color: #ffffff;
      border: 1px solid #0f172a;
      border-radius: 6px;
      font-weight: 800;
      font-size: 0.8rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;
    }
    .btn-nav:hover:not(:disabled) { background: #1e293b; }
    .btn-nav:disabled { opacity: 0.35; cursor: not-allowed; }
    .select-post { min-width: 240px; font-weight: 600; color: #0f172a; }
    .post-counter { font-size: 0.72rem; color: #64748b; font-weight: 700; }

    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
    select, input { padding: 0.45rem 0.6rem; border: 1px solid var(--coraza-border); border-radius: 8px; font: inherit; }
    .status { padding: 0.3rem 0.7rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; align-self: center; }
    .st-borrador { background: #fff3cd; color: #8a6d00; }
    .st-publicado { background: #d1e7dd; color: #0f5132; }
    .st-anulado { background: #f8d7da; color: #842029; }
    .actions { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: end; margin-bottom: 1rem; }
    .tpl { display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.75rem; color: var(--coraza-text-muted); }
    button { padding: 0.5rem 0.9rem; border: 1px solid var(--coraza-border); border-radius: 8px; background: var(--coraza-surface); cursor: pointer; font: inherit; }
    button:hover:not(:disabled) { background: var(--primary-50); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    button.primary { background: var(--primary-dark); color: #fff; border-color: var(--primary-dark); }
    button.success { background: #198754; color: #fff; border-color: #198754; }
    button.danger { background: #dc3545; color: #fff; border-color: #dc3545; }
    button.btn-print { background: #0f766e; color: #fff; border-color: #0f766e; font-weight: 600; }
    button.btn-print:hover:not(:disabled) { background: #115e59; }
    button.sm { padding: 0.3rem 0.6rem; font-size: 0.8rem; }
    .empty-state { padding: 2rem; text-align: center; border: 1px dashed var(--coraza-border); border-radius: 12px; }
    .motor-ok-banner {
      background: #dcfce7;
      border: 1px solid #86efac;
      color: #166534;
      padding: 0.65rem 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      font-weight: 600;
      font-size: 0.88rem;
    }
    .roles-panel { margin-bottom: 1rem; padding: 1rem; border: 1px solid var(--coraza-border); border-radius: 12px; background: var(--coraza-surface); }
    .roles-panel h3 { margin: 0 0 0.75rem; font-size: 0.95rem; }
    .roles-grid { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem; }
    .role-row { display: grid; grid-template-columns: 1fr 1.5fr auto; gap: 0.5rem; align-items: center; }
    .titular-autocomplete-wrap { position: relative; min-width: 0; }
    .titular-dropdown { position: absolute; z-index: 120; left: 0; right: 0; top: calc(100% + 4px); max-height: 240px; }
    .assoc-hint { margin: 0.35rem 0 0; font-size: 0.75rem; color: #64748b; }
    .role-name { width: 100%; }
    .matrix-wrap { overflow: auto; max-height: 65vh; border: 1px solid var(--coraza-border); border-radius: 8px; }
    .matrix { border-collapse: collapse; min-width: 100%; font-size: 0.75rem; }
    th, td { border: 1px solid var(--coraza-border); padding: 0.35rem 0.2rem; text-align: center; min-width: 32px; }
    th { background: #f8fafc; color: #1e293b; position: sticky; top: 0; z-index: 1; vertical-align: middle; }
    
    /* DOMINGOS Y FESTIVOS (ROJO / SALMON DE ALMANAQUE COLOMBIANO) */
    th.col-sunday, th.col-holiday {
      background: #fee2e2 !important;
      color: #991b1b !important;
      border-color: #fca5a5 !important;
    }
    td.col-sunday, td.col-holiday {
      background-color: #fff1f2;
      border-color: #fed7aa;
    }

    /* SABADOS (AZUL CELESTE SUAVE) */
    th.col-saturday {
      background: #e0f2fe !important;
      color: #0369a1 !important;
      border-color: #bae6fd !important;
    }
    td.col-saturday {
      background-color: #f0f9ff;
      border-color: #e0f2fe;
    }

    .day-dow {
      font-size: 0.65rem;
      font-weight: 800;
      line-height: 1;
      margin-bottom: 2px;
      opacity: 0.85;
      text-transform: uppercase;
    }
    .day-num {
      font-size: 0.85rem;
      font-weight: 800;
      line-height: 1;
    }
    .hol-star {
      font-size: 0.65rem;
      color: #dc2626;
      display: block;
      margin-top: 1px;
    }

    .calendar-indicators {
      display: flex;
      gap: 0.85rem;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 0.85rem;
      padding: 0.55rem 0.85rem;
      background: #f8fafc;
      border-radius: 0.5rem;
      border: 1px solid #e2e8f0;
      font-size: 0.8rem;
    }
    .ind-pill {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      color: #334155;
    }
    .ind-box {
      display: inline-block;
      padding: 0.15rem 0.45rem;
      border-radius: 0.3rem;
      font-weight: 800;
      font-size: 0.72rem;
    }
    .sun-bg { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .sat-bg { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
    .week-bg { background: #ffffff; color: #475569; border: 1px solid #cbd5e1; }

    .sticky-col { position: sticky; left: 0; background: var(--coraza-surface); text-align: left; min-width: 170px; z-index: 2; }
    .role-label { font-weight: 600; }
    .role-titular { color: var(--coraza-text-muted); font-size: 0.7rem; }
    .cell { cursor: pointer; user-select: none; font-weight: 600; }
    .cell:hover { outline: 2px solid var(--primary-dark); outline-offset: -2px; }
    .cell.alert-error { outline: 1.5px dashed #dc2626; outline-offset: -2px; }
    .cell.alert-warn { outline: 1.5px dashed #d97706; outline-offset: -2px; }
    .c-d { background: #d1e7dd; color: #0f5132; }
    .c-n { background: #cfe2ff; color: #084298; }
    .c-d8 { background: #b7e4c7; color: #1b4332; }
    .c-n8 { background: #9ec5fe; color: #052c65; }
    .c-dr { background: #e9ecef; color: #495057; }
    .c-nr { background: #ced4da; color: #212529; }
    .c-vac { background: #fff3cd; color: #664d03; }
    .c-lc { background: #ffe5d0; color: #8a4b00; }
    .c-in { background: #f8d7da; color: #842029; }
    .c-sp { background: #f5c2c7; color: #58151c; }
    .c-ac { background: #e2b6cf; color: #6a1a4c; }
    .legend { margin-top: 0.75rem; display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
    .badge { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 6px; font-weight: 700; }
    .hint { color: var(--coraza-text-muted); font-size: 0.8rem; }
    .hint.warn { color: #8a6d00; font-weight: 600; }
    .error { color: var(--coraza-error); }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 50; }
    .modal { background: #fff; border-radius: 12px; padding: 1.5rem; width: min(420px, 92vw); display: flex; flex-direction: column; gap: 0.85rem; }
    .modal h3 { margin: 0; }
    .modal-sub { margin: 0; color: var(--coraza-text-muted); font-size: 0.85rem; }
    
    .time-range-box {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 0.75rem;
      border-radius: 0.5rem;
      margin-top: 0.25rem;
    }
    .time-range-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
    }
    .time-label {
      font-size: 0.75rem !important;
      font-weight: 700;
      color: #334155;
    }
    .inp-time {
      padding: 0.4rem 0.55rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.45rem;
      font-size: 0.85rem;
      font-weight: 600;
      width: 100%;
      box-sizing: border-box;
    }
    .hours-badge {
      font-size: 0.75rem;
      font-weight: 700;
      color: #0f766e;
      background: #f0fdf4;
      padding: 0.35rem 0.5rem;
      border-radius: 0.35rem;
      border: 1px solid #bbf7d0;
      text-align: center;
    }
    /* METRICAS Y HORAS EN VIVO POR GUARDIA (COLUMNAS FINALES) */
    .summary-th {
      background: #0f172a !important;
      color: #ffffff !important;
      font-size: 0.72rem;
      font-weight: 800;
      min-width: 44px;
      position: sticky;
      top: 0;
      z-index: 1;
    }
    .summary-td {
      font-weight: 700;
      font-size: 0.8rem;
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #334155;
    }
    .diurno-td { color: #854d0e; background: #fefce8; }
    .nocturno-td { color: #166534; background: #f0fdf4; }
    .hours-td { background: #e0f2fe; color: #0369a1; }
    .hours-over { background: #fee2e2 !important; color: #991b1b !important; }

    /* BOTONERA DE NOVEDADES EN 1 CLIC (MODAL) */
    .quick-novelty-bar {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.65rem;
    }
    .quick-label {
      font-size: 0.72rem;
      font-weight: 800;
      color: #475569;
      text-transform: uppercase;
    }
    .quick-btns {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.35rem;
    }
    .btn-q {
      padding: 0.4rem 0.25rem;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.72rem;
      font-weight: 800;
      cursor: pointer;
      text-align: center;
      transition: transform 0.1s, filter 0.1s;
    }
    .btn-q:hover { transform: scale(1.03); filter: brightness(0.95); }

    /* BUSCADOR AUTOCOMPLETE DE PUESTOS */
    .post-autocomplete-wrap {
      position: relative;
      min-width: 320px;
      flex: 1;
    }
    .inp-post-combobox {
      width: 100%;
      padding: 0.45rem 2rem 0.45rem 0.75rem;
      border: 1.5px solid #0369a1;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.85rem;
      background: #ffffff;
      color: #0f172a;
      box-sizing: border-box;
      cursor: text;
    }
    .inp-post-combobox:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
    }
    .btn-clear-post-search {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      background: #e2e8f0;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      font-size: 0.7rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 95;
    }
    .dropdown-backdrop {
      position: fixed;
      inset: 0;
      z-index: 90;
      background: transparent;
    }
    .post-dropdown-panel {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      margin-top: 4px;
      max-height: 280px;
      overflow-y: auto;
      background: #ffffff;
      border: 1.5px solid #0369a1;
      border-radius: 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.25);
      z-index: 100;
      display: flex;
      flex-direction: column;
    }
    .post-dropdown-item {
      padding: 0.6rem 0.85rem;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      font-size: 0.84rem;
      color: #0f172a;
      transition: background 0.1s;
    }
    .post-dropdown-item:hover {
      background: #f0f9ff;
      color: #0369a1;
    }
    .post-dropdown-item.selected {
      background: #e0f2fe;
      color: #0c4a6e;
      font-weight: 800;
    }
    .post-dropdown-empty {
      padding: 1rem;
      text-align: center;
      font-size: 0.82rem;
      color: #64748b;
    }

    .assoc-search-box {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.65rem;
    }
    .assoc-label {
      font-size: 0.75rem !important;
      font-weight: 700;
      color: #334155;
    }
    .current-assoc-badge {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f0f9ff;
      border: 1px solid #bfdbfe;
      color: #0369a1;
      padding: 0.35rem 0.6rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 700;
      margin-top: 0.2rem;
    }
    .btn-clear-assoc {
      background: none;
      border: none;
      color: #991b1b;
      font-weight: 800;
      cursor: pointer;
      padding: 0 0.3rem;
    }
    .search-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .inp-search-assoc {
      width: 100%;
      padding: 0.45rem 0.6rem;
      border: 1.5px solid #3b82f6;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 600;
      background: #ffffff;
      box-sizing: border-box;
    }
    .btn-clear-search {
      position: absolute;
      right: 8px;
      background: #e2e8f0;
      border: none;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      font-size: 0.7rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .search-results-list {
      max-height: 180px;
      overflow-y: auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .assoc-option {
      padding: 0.45rem 0.65rem;
      border-bottom: 1px solid #f1f5f9;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      transition: background 0.1s;
    }
    .assoc-option:hover {
      background: #e0f2fe;
    }
    .assoc-option.selected {
      background: #bfdbfe;
      font-weight: 800;
    }
    .assoc-name { font-size: 0.82rem; font-weight: 700; color: #0f172a; }
    .assoc-cc { font-size: 0.72rem; color: #64748b; font-weight: 600; }
    .assoc-no-results {
      padding: 0.65rem;
      font-size: 0.78rem;
      color: #94a3b8;
      text-align: center;
    }

    .quick-pattern-bar {
      margin-bottom: 1rem;
      padding: 0.85rem 1.15rem;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .qpb-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .qpb-title {
      font-size: 0.9rem;
      font-weight: 800;
      color: #0f172a;
    }
    .qpb-hint {
      font-size: 0.78rem;
      color: #64748b;
    }
    .qpb-controls {
      display: flex;
      align-items: flex-end;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .qpb-field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: #334155;
    }
    .qpb-field select {
      padding: 0.4rem 0.6rem;
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.82rem;
      font-weight: 600;
      background: #ffffff;
    }
    .btn-apply-pattern {
      background: #0369a1;
      color: #ffffff;
      border: 1px solid #0369a1;
      border-radius: 6px;
      padding: 0.45rem 0.9rem;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.4rem;
      transition: background 0.15s;
    }
    .btn-apply-pattern:hover:not(:disabled) {
      background: #0369a1;
    }

    .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem; }
  `,
})
export class ScheduleBoard implements OnInit {
  private readonly api = inject(MonthlySchedulingApiService);
  private readonly schedulingApi = inject(SchedulingApiService);
  private readonly associatesApi = inject(AssociatesApiService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);

  readonly codes = CODES;

  readonly posts = signal<{ id: string; name: string }[]>([]);
  readonly associates = signal<Associate[]>([]);
  readonly schedule = signal<MonthlySchedule | null>(null);
  readonly personal = signal<PersonalRole[]>([]);
  readonly cells = signal<Map<string, CellState>>(new Map());

  postId = '';
  month = this.currentMonth();
  tipoCiclo: '12x3' | '10x5' | '2x2' | '13x2' = '12x3';
  selectedTemplateId = '';
  readonly postSearchQuery = signal('');
  readonly associateSearchQuery = signal('');
  readonly postDropdownOpen = signal(false);
  readonly titularPickerIndex = signal<number | null>(null);
  readonly titularPickerQuery = signal('');

  onPostSearchChange(val: string): void {
    this.postSearchQuery.set(val);
    this.postDropdownOpen.set(true);
  }

  selectPost(p: { id: string; name: string }): void {
    this.postId = p.id;
    this.postSearchQuery.set(p.name);
    this.postDropdownOpen.set(false);
    this.onSelectionChange();
  }

  clearPostSearch(): void {
    this.syncPostSearchLabel();
    this.postDropdownOpen.set(false);
  }

  private syncPostSearchLabel(): void {
    if (!this.postId) {
      this.postSearchQuery.set('');
      return;
    }
    const p = this.posts().find((x) => x.id === this.postId);
    this.postSearchQuery.set(p?.name ?? '');
  }

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly dirty = signal(false);
  readonly error = signal<string | null>(null);
  readonly motorOk = signal<string | null>(null);
  readonly templates = signal<ScheduleTemplate[]>([]);

  readonly editing = signal<{ role: PersonalRole; roleName: string; day: number } | null>(null);
  editAssociateId: string | null = null;
  editCodigo = '';
  editInicio: string | null = null;
  editFin: string | null = null;

  readonly filteredPosts = computed(() => {
    const q = this.postSearchQuery().trim().toLowerCase();
    const all = this.posts();
    if (!q) return all;
    const selected = all.find((p) => p.id === this.postId);
    if (selected && q === selected.name.toLowerCase()) return all;
    return all.filter((p) => p.name.toLowerCase().includes(q));
  });

  readonly filteredAssociates = computed(() =>
    this.filterAssociatesByQuery(this.associateSearchQuery()),
  );

  readonly filteredPickerAssociates = computed(() =>
    this.filterAssociatesByQuery(this.titularPickerQuery()),
  );

  readonly selectedAssociateLabel = computed(() => {
    if (!this.editAssociateId) return 'Sin asignar / Titular por defecto';
    const a = this.associates().find(x => x.id === this.editAssociateId);
    return a ? `${this.associateName(a)} (CC: ${a.documentNumber})` : 'Asociado seleccionado';
  });

  readonly boardAlerts = signal<BoardAlertsResponse | null>(null);
  readonly monthConflictAlerts = signal<ScheduleAlertItem[]>([]);
  readonly confirmOpen = signal(false);
  readonly confirmTitle = signal('Confirmar');
  readonly confirmMessage = signal('');
  readonly confirmDetail = signal<string | null>(null);
  private confirmAction: (() => void) | null = null;
  private pendingSavePayload: SavePayload | null = null;

  readonly holidays = computed(() => {
    const [year] = this.month.split('-').map(Number);
    return getColombiaHolidays(year || new Date().getFullYear());
  });

  readonly days = computed(() => {
    const [year, mon] = this.month.split('-').map(Number);
    const count = new Date(year, mon, 0).getDate();
    return Array.from({ length: count }, (_, i) => i + 1);
  });

  private readonly associateMap = computed(() => {
    const map = new Map<string, Associate>();
    for (const a of this.associates()) map.set(a.id, a);
    return map;
  });

  readonly currentPostIndex = computed(() => {
    return this.posts().findIndex((p) => p.id === this.postId);
  });

  readonly canPrevPost = computed(() => {
    return this.currentPostIndex() > 0;
  });

  readonly canNextPost = computed(() => {
    const idx = this.currentPostIndex();
    return idx >= 0 && idx < this.posts().length - 1;
  });

  prevPost(): void {
    const idx = this.currentPostIndex();
    if (idx > 0) {
      this.postId = this.posts()[idx - 1].id;
      this.syncPostSearchLabel();
      this.onSelectionChange();
    }
  }

  nextPost(): void {
    const idx = this.currentPostIndex();
    if (idx >= 0 && idx < this.posts().length - 1) {
      this.postId = this.posts()[idx + 1].id;
      this.syncPostSearchLabel();
      this.onSelectionChange();
    }
  }

  getGuardMetrics(roleKey: string): { dias: number; turnosD: number; turnosN: number; totalHoras: number } {
    let dias = 0;
    let turnosD = 0;
    let turnosN = 0;
    let totalHoras = 0;

    for (const d of this.days()) {
      const state = this.cells().get(`${roleKey}:${d}`);
      if (!state || !state.codigo) continue;
      const c = state.codigo;
      if (c === 'D') {
        dias++;
        turnosD++;
        totalHoras += 12;
      } else if (c === 'N') {
        dias++;
        turnosN++;
        totalHoras += 12;
      } else if (c === 'D8') {
        dias++;
        turnosD++;
        totalHoras += 8;
      } else if (c === 'N8') {
        dias++;
        turnosN++;
        totalHoras += 8;
      }
    }

    return { dias, turnosD, turnosN, totalHoras };
  }

  quickSelectCode(code: string): void {
    this.editCodigo = code;
    this.onEditCodigoChange(code);
  }

  ngOnInit(): void {
    const qp = this.route.snapshot.queryParamMap;
    const qPost = qp.get('postId');
    const qMonth = qp.get('month');
    const qYear = qp.get('year');
    if (qPost) this.postId = qPost;

    let monthFromQuery = false;
    if (qMonth && /^\d{4}-\d{2}$/.test(qMonth)) {
      this.month = qMonth;
      monthFromQuery = true;
    } else if (qYear && qMonth && /^\d+$/.test(qMonth)) {
      this.month = `${qYear}-${String(Number(qMonth)).padStart(2, '0')}`;
      monthFromQuery = true;
    }

    this.schedulingApi.listPosts().subscribe({
      next: (posts) => {
        this.posts.set(posts);
        this.syncPostSearchLabel();
      },
      error: () => this.error.set('No se pudieron cargar los puestos'),
    });
    this.associatesApi.lookup('ACTIVO').subscribe({
      next: (list) => this.associates.set(list),
      error: () => this.error.set('No se pudieron cargar los asociados'),
    });
    this.api.listTemplates().subscribe({
      next: (rows) => this.templates.set(rows),
    });

    const afterMonthReady = () => {
      if (this.postId && this.month) this.onSelectionChange();
    };

    if (monthFromQuery) {
      afterMonthReady();
    } else {
      this.api.getActivePeriod().subscribe({
        next: (p) => {
          this.month = `${p.year}-${String(p.month).padStart(2, '0')}`;
          afterMonthReady();
        },
        error: () => afterMonthReady(),
      });
    }
  }

  holidayName(day: number): string | null {
    const [year, mon] = this.month.split('-').map(Number);
    return isColombiaHoliday(year, mon, day, this.holidays())?.name ?? null;
  }

  private readonly scheduleCache = new Map<string, MonthlySchedule | null>();

  onSelectionChange(): void {
    this.editing.set(null);
    this.motorOk.set(null);
    this.loadSchedule();
  }

  private loadSchedule(force = false): void {
    if (!this.postId || !this.month) {
      this.schedule.set(null);
      this.boardAlerts.set(null);
      return;
    }
    const [year, mon] = this.month.split('-').map(Number);
    const cacheKey = `${this.postId}:${year}:${mon}`;

    if (!force && this.scheduleCache.has(cacheKey)) {
      const cached = this.scheduleCache.get(cacheKey) ?? null;
      this.applySchedule(cached);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.api.getOne(this.postId, year, mon).subscribe({
      next: (sched) => {
        this.scheduleCache.set(cacheKey, sched);
        this.applySchedule(sched);
        this.loading.set(false);
        this.reloadBoardAlerts(year, mon);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar la programación');
      },
    });
  }

  private reloadBoardAlerts(year: number, mon: number): void {
    if (!this.postId) return;
    this.api.getBoardAlerts(this.postId, year, mon).subscribe({
      next: (res) => this.boardAlerts.set(res),
      error: () => this.boardAlerts.set(null),
    });
  }

  createSchedule(): void {
    if (!this.postId || !this.month) return;
    const [year, mon] = this.month.split('-').map(Number);
    this.saving.set(true);
    this.api.createOrGet(this.postId, year, mon).subscribe({
      next: (sched) => {
        const cacheKey = `${this.postId}:${year}:${mon}`;
        this.scheduleCache.set(cacheKey, sched);
        this.applySchedule(sched);
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo crear la programación');
      },
    });
  }

  runMotor(): void {
    if (!this.postId || !this.month) {
      this.error.set('Selecciona un puesto y un mes');
      return;
    }

    const launch = (sched: MonthlySchedule) => {
      if (!this.personal().length) {
        this.error.set('Agrega al menos un rol en Personal / Roles antes de aplicar el motor.');
        return;
      }
      if (this.dirty() && !confirm('Se sobrescribirán las celdas actuales. ¿Continuar?')) return;
      this.executeMotor(sched.id);
    };

    const sched = this.schedule();
    if (sched) {
      launch(sched);
      return;
    }

    const [year, mon] = this.month.split('-').map(Number);
    this.saving.set(true);
    this.error.set(null);
    this.api.createOrGet(this.postId, year, mon).subscribe({
      next: (created) => {
        const cacheKey = `${this.postId}:${year}:${mon}`;
        this.scheduleCache.set(cacheKey, created);
        this.applySchedule(created);
        this.saving.set(false);
        launch(created);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo crear la programación del mes');
      },
    });
  }

  private executeMotor(scheduleId: string): void {
    const [year, mon] = this.month.split('-').map(Number);
    this.saving.set(true);
    this.error.set(null);
    this.motorOk.set(null);
    this.api
      .generateMotor(scheduleId, {
        tipoCiclo: this.tipoCiclo,
        personal: this.personalForMotor(),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.reloadScheduleAfterMotor(year, mon);
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.error.set(this.formatMotorError(err));
        },
      });
  }

  /** Personal enviado al motor (associateId null, no string vacío). */
  private personalForMotor(): PersonalRole[] {
    return this.personal().map((p) => ({
      rol: p.rol,
      associateId: p.associateId || null,
      turnoId: p.turnoId ?? null,
      displayName: p.displayName,
    }));
  }

  private reloadScheduleAfterMotor(year: number, mon: number): void {
    const cacheKey = `${this.postId}:${year}:${mon}`;
    this.scheduleCache.delete(cacheKey);
    this.loading.set(true);
    this.api.getOne(this.postId, year, mon).subscribe({
      next: (sched) => {
        this.scheduleCache.set(cacheKey, sched);
        this.applySchedule(sched);
        this.loading.set(false);
        const n = sched?.assignments?.length ?? 0;
        if (n === 0) {
          this.error.set(
            'El motor no generó celdas. Verifica roles en Personal / Roles o contacta soporte.',
          );
        } else {
          this.motorOk.set(`Motor aplicado: ${n} celdas en ${this.monthLabel()}.`);
          this.reloadBoardAlerts(year, mon);
        }
      },
      error: () => {
        this.loading.set(false);
        this.error.set(
          'El motor pudo ejecutarse pero no se pudo recargar el cuadro. Pulsa Reintentar.',
        );
      },
    });
  }

  private formatMotorError(err: HttpErrorResponse): string {
    const body = err.error as { message?: string | string[] } | null;
    if (typeof body?.message === 'string') return body.message;
    if (Array.isArray(body?.message)) return body.message.join('; ');
    if (err.status === 403) return 'Sin permiso scheduling.edit para aplicar el motor.';
    return 'No se pudo ejecutar el motor de ciclo';
  }

  saveAsTemplate(): void {
    const sched = this.schedule();
    if (!sched) return;
    const name = prompt('Nombre de la plantilla', `Plantilla ${this.month}`);
    if (!name?.trim()) return;
    this.saving.set(true);
    this.api.createTemplate({ name: name.trim(), fromScheduleId: sched.id }).subscribe({
      next: (t) => {
        this.templates.update((list) => [t, ...list]);
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo guardar la plantilla');
      },
    });
  }

  applySelectedTemplate(): void {
    const sched = this.schedule();
    if (!sched || !this.selectedTemplateId) return;
    if (!confirm('¿Aplicar la plantilla? Se reemplazarán las celdas actuales.')) return;
    this.saving.set(true);
    this.api.applyTemplate(sched.id, this.selectedTemplateId).subscribe({
      next: (updated) => {
        this.applySchedule(updated);
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo aplicar la plantilla');
      },
    });
  }

  applyCustomPattern(targetRole: string, patternKey: string, startDay: number = 1): void {
    const rolesToFill = targetRole === 'ALL' 
      ? this.personal() 
      : this.personal().filter(r => r.rol === targetRole);
    
    if (rolesToFill.length === 0) return;

    let sequence: string[] = ['D', 'D', 'N', 'N', 'DR', 'DR'];
    if (patternKey === '2x2x2') sequence = ['D', 'D', 'N', 'N', 'DR', 'DR'];
    else if (patternKey === '2x2x2_N') sequence = ['N', 'N', 'D', 'D', 'DR', 'DR'];
    else if (patternKey === '6x1_D') sequence = ['D', 'D', 'D', 'D', 'D', 'D', 'DR'];
    else if (patternKey === '6x1_N') sequence = ['N', 'N', 'N', 'N', 'N', 'N', 'DR'];
    else if (patternKey === '4x2') sequence = ['D', 'D', 'D', 'D', 'DR', 'DR'];
    else if (patternKey === 'D_ALL') sequence = ['D'];
    else if (patternKey === 'N_ALL') sequence = ['N'];

    const days = this.days();
    const map = new Map(this.cells());

    rolesToFill.forEach((role, rIdx) => {
      const roleOffset = targetRole === 'ALL' ? (rIdx * 2) % sequence.length : 0;
      
      days.forEach((d) => {
        if (d < startDay) return;
        
        let codeStr = 'D';
        if (patternKey === 'D8_L_V') {
          const isWknd = this.isSunday(d) || this.isSaturday(d);
          codeStr = isWknd ? 'DR' : 'D8';
        } else {
          const seqIdx = (d - startDay + roleOffset) % sequence.length;
          codeStr = sequence[seqIdx];
        }

        const cfg = CODES.find(c => c.codigo === codeStr) || CODES[0];
        const key = `${role.rol}:${d}`;
        map.set(key, {
          associateId: role.associateId,
          jornada: cfg.jornada,
          codigo: cfg.codigo,
          turno: cfg.turno,
          inicio: cfg.inicio,
          fin: cfg.fin,
        });
      });
    });

    this.cells.set(map);
    this.dirty.set(true);
  }

  save(): void {
    const sched = this.schedule();
    if (!sched) return;
    const assignments = Array.from(this.cells().entries())
      .map(([key, state]) => {
        const day = Number(key.split(':')[1]);
        const role = key.slice(0, key.lastIndexOf(':'));
        return {
          day,
          role,
          associateId: state.associateId,
          turno: state.turno,
          jornada: state.jornada,
          codigo: state.codigo,
          inicio: state.inicio,
          fin: state.fin,
        };
      })
      .filter((a) => a.jornada !== 'sin_asignar' || a.associateId);

    const payload: SavePayload = {
      personal: this.personal(),
      assignments,
    };
    this.persistSave(sched.id, payload, false);
  }

  private persistSave(id: string, savePayload: SavePayload, confirmWarnings: boolean): void {
    this.saving.set(true);
    this.api
      .save(id, { ...savePayload, confirmWarnings: confirmWarnings || undefined })
      .subscribe({
        next: (updated) => {
          const [year, mon] = this.month.split('-').map(Number);
          const cacheKey = `${this.postId}:${year}:${mon}`;
          this.scheduleCache.set(cacheKey, updated);
          this.applySchedule(updated);
          this.saving.set(false);
          this.confirmOpen.set(false);
          this.pendingSavePayload = null;
          this.reloadBoardAlerts(year, mon);
        },
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          const body = err.error as {
            code?: string;
            message?: string | { code?: string; message?: string; warnings?: ScheduleAlertItem[] };
            warnings?: ScheduleAlertItem[];
          } | null;
          const warnBody =
            body && typeof body.message === 'object' && body.message ? body.message : body;
          if (err.status === 409 && warnBody?.code === 'SCHEDULING_WARNINGS') {
            const warnings = warnBody.warnings ?? body?.warnings ?? [];
            const msgs = warnings.map((w) => w.message).join('\n');
            this.pendingSavePayload = savePayload;
            this.confirmAction = () => {
              if (this.pendingSavePayload) {
                this.persistSave(id, this.pendingSavePayload, true);
              }
            };
            this.confirmTitle.set('Advertencias de programación');
            this.confirmMessage.set(
              (typeof warnBody.message === 'string'
                ? warnBody.message
                : null) ?? 'Hay advertencias; puede guardar de todos modos.',
            );
            this.confirmDetail.set(msgs || null);
            this.confirmOpen.set(true);
            return;
          }
          this.error.set('No se pudo guardar la programación');
        },
      });
  }

  setStatus(status: 'borrador' | 'publicado'): void {
    const sched = this.schedule();
    if (!sched) return;
    this.saving.set(true);
    this.api.updateStatus(sched.id, status).subscribe({
      next: (updated) => {
        this.applySchedule(updated);
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo cambiar el estado');
      },
    });
  }

  printPlanillaCartelera(): void {
    const sched = this.schedule();
    const post = this.posts().find(p => p.id === this.postId);
    if (!sched || !post) return;

    const month = this.month;
    const [yStr, mStr] = month.split('-');
    const year = parseInt(yStr, 10);
    const mNum = parseInt(mStr, 10);
    const daysInMonth = new Date(year, mNum, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const monthNames = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const monthLabel = `${monthNames[mNum - 1]} DE ${year}`;

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Por favor permita ventanas emergentes para imprimir la planilla.');
      return;
    }

    const holidays = getColombiaHolidays(year);
    const holidayDates = new Set(holidays.map(h => h.date));

    let headerThs = '';
    for (const d of days) {
      const dObj = new Date(year, mNum - 1, d);
      const isSun = dObj.getDay() === 0;
      const iso = `${year}-${String(mNum).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isHol = holidayDates.has(iso);
      const bg = isSun ? '#fee2e2' : isHol ? '#fef3c7' : '#f8fafc';
      const color = isSun ? '#991b1b' : isHol ? '#92400e' : '#1e293b';
      headerThs += `<th style="background:${bg}; color:${color}; border:1px solid #94a3b8; padding:3px 1px; font-size:9px; text-align:center; min-width:18px;">${d}</th>`;
    }

    let rowsHtml = '';
    for (const role of this.personal()) {
      const assoc = role.associateId ? this.associates().find(a => a.id === role.associateId) : null;
      const assocName = assoc ? `${assoc.firstName} ${assoc.lastName}` : 'SIN ASIGNAR';
      const assocCc = assoc?.documentNumber ? `CC: ${assoc.documentNumber}` : '—';

      let cellsTds = '';
      for (const d of days) {
        const state = this.cells().get(`${role.rol}:${d}`);
        const code = state?.codigo || '—';
        let cellBg = '#ffffff';
        let cellColor = '#334155';
        let fontW = 'normal';

        if (code === 'D' || code === 'D8') {
          cellBg = '#fef08a'; cellColor = '#854d0e'; fontW = 'bold';
        } else if (code === 'N' || code === 'N8') {
          cellBg = '#bbf7d0'; cellColor = '#166534'; fontW = 'bold';
        } else if (code === 'DR' || code === 'NR' || code === 'L') {
          cellBg = '#f1f5f9'; cellColor = '#475569';
        } else if (code === 'IN' || code === 'VAC' || code === 'LC' || code === 'SP') {
          cellBg = '#fee2e2'; cellColor = '#991b1b'; fontW = 'bold';
        }

        cellsTds += `<td style="background:${cellBg}; color:${cellColor}; font-weight:${fontW}; border:1px solid #cbd5e1; text-align:center; font-size:9.5px; padding:4px 1px;">${code}</td>`;
      }

      rowsHtml += `
        <tr>
          <td style="border:1px solid #94a3b8; padding:4px 6px; font-size:10px; background:#f8fafc;">
            <strong>${role.displayName || role.rol}</strong><br>
            <span style="font-size:9px; color:#1e293b;">${assocName}</span><br>
            <span style="font-size:8px; color:#64748b;">${assocCc}</span>
          </td>
          ${cellsTds}
        </tr>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Planilla de Programación - ${post.name} - ${monthLabel}</title>
        <style>
          @page { size: landscape; margin: 8mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; color: #0f172a; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 8px; }
          .brand-title { font-size: 15px; font-weight: bold; color: #0f172a; margin: 0; }
          .brand-sub { font-size: 8.5px; color: #475569; margin: 2px 0 0; }
          .meta-box { border: 1px solid #0f172a; padding: 4px 8px; border-radius: 4px; text-align: right; background: #f8fafc; }
          .meta-box h3 { margin: 0; font-size: 11px; color: #0369a1; }
          .meta-box p { margin: 2px 0 0; font-size: 9px; }
          .post-bar { display: flex; justify-content: space-between; background: #0f172a; color: #ffffff; padding: 4px 8px; font-size: 10px; border-radius: 3px; margin-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
          .convenciones { display: flex; gap: 10px; font-size: 8.5px; margin-bottom: 14px; background: #f1f5f9; padding: 4px 8px; border-radius: 3px; }
          .conv-item { display: flex; align-items: center; gap: 3px; }
          .conv-box { display: inline-block; width: 14px; height: 12px; text-align: center; line-height: 12px; font-weight: bold; border-radius: 2px; font-size: 8px; }
          .signatures { display: flex; justify-content: space-around; margin-top: 20px; }
          .sign-box { width: 200px; text-align: center; border-top: 1px solid #0f172a; padding-top: 4px; font-size: 9px; }
          .membrete-footer { margin-top: 24px; border-top: 2px solid #0369a1; padding-top: 6px; display: flex; justify-content: space-between; align-items: center; font-size: 8px; color: #475569; }
          .footer-col { display: flex; align-items: center; gap: 4px; }
        </style>
      </head>
      <body>
        <div class="header" style="display:flex; justify-content:space-between; align-items:center; border-bottom:2.5px solid #0369a1; padding-bottom:8px; margin-bottom:8px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <img src="/brand/logo-coraza-cta.png" style="width:48px; height:48px; border-radius:50%;" alt="Logo Coraza" onerror="this.style.display='none'">
            <div>
              <h1 style="font-size:15px; font-weight:800; color:#0f172a; margin:0; letter-spacing:0.5px;">CORAZA SEGURIDAD C.T.A.</h1>
              <p style="font-size:8.5px; color:#0369a1; font-weight:700; margin:1px 0;">La Seguridad un Compromiso de Todos</p>
              <p style="font-size:7.8px; color:#64748b; margin:0;">NIT: 811.026.837-1 · VIGILADO Supervigilancia Resolución 6889 del 29 de septiembre de 2011</p>
            </div>
          </div>
          <div class="meta-box" style="border:1.5px solid #0369a1; padding:5px 10px; border-radius:6px; text-align:right; background:#f8fafc;">
            <h3 style="margin:0; font-size:11px; color:#0369a1; font-weight:800;">PLANILLA OFICIAL DE PROGRAMACIÓN DE PUESTO</h3>
            <p style="margin:2px 0 0; font-size:9.5px; font-weight:700; color:#0f172a;">Periodo: ${monthLabel}</p>
          </div>
        </div>

        <div class="post-bar" style="background:#0369a1;">
          <span><strong>PUESTO DE SERVICIO:</strong> ${post.name}</span>
          <span><strong>ESTADO:</strong> OFICIAL / CARTELERA</span>
          <span><strong>FECHA EMISIÓN:</strong> ${new Date().toLocaleDateString('es-CO')}</span>
        </div>

        <div class="convenciones">
          <strong>CONVENCIONES:</strong>
          <span class="conv-item"><span class="conv-box" style="background:#fef08a; color:#854d0e;">D</span> Diurno 12h (06:00 - 18:00)</span>
          <span class="conv-item"><span class="conv-box" style="background:#bbf7d0; color:#166534;">N</span> Nocturno 12h (18:00 - 06:00)</span>
          <span class="conv-item"><span class="conv-box" style="background:#f1f5f9; color:#475569;">DR</span> Descanso Remunerado</span>
          <span class="conv-item"><span class="conv-box" style="background:#fee2e2; color:#991b1b;">IN</span> Incapacidad / Novedad Médica</span>
          <span class="conv-item"><span class="conv-box" style="background:#fef3c7; color:#92400e;">VAC</span> Vacaciones</span>
          <span class="conv-item" style="color:#991b1b;">■ Domingos / Festivos</span>
        </div>

        <table>
          <thead>
            <tr>
              <th style="border:1px solid #94a3b8; background:#0f172a; color:#ffffff; padding:4px 6px; font-size:9.5px; text-align:left; width:150px;">Rol / Personal</th>
              ${headerThs}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sign-box">
            <strong>SUPERVISOR DE OPERACIONES</strong><br>
            <span>Coraza Seguridad C.T.A.</span>
          </div>
          <div class="sign-box">
            <strong>COORDINADOR DE PUESTO</strong><br>
            <span>Vigilancia y Control</span>
          </div>
          <div class="sign-box">
            <strong>ADMINISTRADOR / CLIENTE</strong><br>
            <span>Visto Bueno de Recepción</span>
          </div>
        </div>

        <div class="membrete-footer" style="display:flex; justify-content:space-between; align-items:center; border-top:2px solid #0369a1; padding-top:6px; margin-top:20px; font-size:8px; color:#475569;">
          <div style="display:flex; gap:12px; align-items:center;">
            <div class="footer-col"><strong> Correo:</strong> info@corazaseguridadcta.com</div>
            <div class="footer-col"><strong> Web:</strong> www.corazaseguridadcta.com</div>
            <div class="footer-col"><strong> PBX:</strong> (604) 4447929</div>
            <div class="footer-col"><strong> Ubicación:</strong> Medellín - Colombia</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <img src="/brand/membrete/image3.png" style="height:24px;" alt="ISO 9001" onerror="this.style.display='none'">
            <img src="/brand/membrete/image8.png" style="height:20px;" alt="Huella de Carbono" onerror="this.style.display='none'">
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  }

  addRole(): void {
    const rol = `turno_${Date.now()}`;
    this.personal.update((list) => [
      ...list,
      { rol, associateId: null, turnoId: 'AM', displayName: `Rol ${list.length + 1}` },
    ]);
    this.dirty.set(true);
  }

  removeRole(index: number): void {
    const role = this.personal()[index];
    this.personal.update((list) => list.filter((_, i) => i !== index));
    this.cells.update((map) => {
      const next = new Map(map);
      for (const key of Array.from(next.keys())) {
        if (key.startsWith(`${role.rol}:`)) next.delete(key);
      }
      return next;
    });
    this.dirty.set(true);
  }

  updateRoleName(index: number, name: string): void {
    this.personal.update((list) =>
      list.map((r, i) => (i === index ? { ...r, displayName: name } : r)),
    );
    this.dirty.set(true);
  }

  updateRoleTitular(index: number, associateId: string | null): void {
    this.personal.update((list) =>
      list.map((r, i) => (i === index ? { ...r, associateId } : r)),
    );
    this.dirty.set(true);
  }

  titularInputValue(index: number, associateId: string | null): string {
    if (this.titularPickerIndex() === index) return this.titularPickerQuery();
    if (!associateId) return '';
    const a = this.associateMap().get(associateId);
    return a ? `${this.associateName(a)} (CC: ${a.documentNumber})` : '';
  }

  openTitularPicker(index: number): void {
    this.titularPickerIndex.set(index);
    const role = this.personal()[index];
    if (role?.associateId) {
      const a = this.associateMap().get(role.associateId);
      this.titularPickerQuery.set(a ? this.associateName(a) : '');
    } else {
      this.titularPickerQuery.set('');
    }
  }

  onTitularSearchChange(index: number, val: string): void {
    this.titularPickerIndex.set(index);
    this.titularPickerQuery.set(val);
  }

  selectTitular(index: number, associateId: string | null): void {
    this.updateRoleTitular(index, associateId);
    this.titularPickerIndex.set(null);
    this.titularPickerQuery.set('');
  }

  private filterAssociatesByQuery(query: string): Associate[] {
    const q = query.trim().toLowerCase();
    const all = this.associates();
    if (q.length < 2) return all;
    const tokens = q.split(/\s+/).filter(Boolean);
    return all.filter((a) => {
      const haystack =
        `${a.firstName ?? ''} ${a.lastName ?? ''} ${a.documentNumber ?? ''}`.toLowerCase();
      return tokens.every((t) => haystack.includes(t));
    });
  }

  openCell(role: PersonalRole, day: number): void {
    const state = this.cells().get(`${role.rol}:${day}`);
    this.editAssociateId = state?.associateId ?? role.associateId ?? null;
    this.editCodigo = state?.codigo ?? '';
    this.editInicio = state?.inicio ?? null;
    this.editFin = state?.fin ?? null;
    this.associateSearchQuery.set('');
    this.editing.set({ role, roleName: role.displayName || role.rol, day });
  }

  onEditCodigoChange(code: string): void {
    const config = this.codes.find((c) => c.codigo === code);
    if (config?.inicio && config?.fin) {
      this.editInicio = config.inicio;
      this.editFin = config.fin;
    } else {
      this.editInicio = null;
      this.editFin = null;
    }
  }

  showTimeInputs(): boolean {
    const isWorkingShift =
      this.editCodigo === 'D' ||
      this.editCodigo === 'N' ||
      this.editCodigo === 'D8' ||
      this.editCodigo === 'N8';
    return Boolean(isWorkingShift || this.editInicio || this.editFin);
  }

  calculatedHoursText(): string | null {
    if (!this.editInicio || !this.editFin) return null;
    const [h1, m1] = this.editInicio.split(':').map(Number);
    const [h2, m2] = this.editFin.split(':').map(Number);
    if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return null;

    let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (mins <= 0) {
      mins += 24 * 60; // cruce de medianoche (ej: 18:00 a 06:00)
    }
    const hrs = mins / 60;
    const hrsFormatted = Number.isInteger(hrs) ? String(hrs) : hrs.toFixed(1);
    if (hrs === 12) return 'Jornada estándar: 12 horas programadas';
    if (hrs === 8) return 'Jornada estándar: 8 horas programadas';
    if (hrs > 12) return `Jornada extendida / doblada: ${hrsFormatted} horas (+${(hrs - 12).toFixed(1)}h extra)`;
    return `Horario personalizado: ${hrsFormatted} horas`;
  }

  closeCell(): void {
    this.editing.set(null);
  }

  applyCell(): void {
    const ctx = this.editing();
    if (!ctx) return;

    const warnings = this.previewCellWarnings(ctx.day, this.editAssociateId, this.editCodigo);
    if (warnings.length) {
      this.confirmTitle.set('Confirmar asignación');
      this.confirmMessage.set(warnings[0]);
      this.confirmDetail.set(warnings.slice(1).join('\n') || null);
      this.confirmAction = () => this.commitCell();
      this.confirmOpen.set(true);
      return;
    }
    this.commitCell();
  }

  private previewCellWarnings(
    day: number,
    associateId: string | null,
    codigo: string,
  ): string[] {
    if (!associateId || !codigo) return [];
    const fringe =
      codigo === 'D' || codigo === 'D8' ? 'D' : codigo === 'N' || codigo === 'N8' ? 'N' : null;
    if (!fringe) return [];

    const msgs: string[] = [];
    const assoc = this.associateMap().get(associateId);
    if (assoc && assoc.status && assoc.status !== 'ACTIVO') {
      msgs.push(
        `Este asociado está ${assoc.status}. Puede programarlo, pero quedará alerta de inactivo y hueco a cubrir.`,
      );
    }

    for (const a of this.monthConflictAlerts()) {
      if (a.type !== 'conflicto_mismo_turno') continue;
      if (a.associateId !== associateId || a.day !== day) continue;
      if (a.shift && a.shift !== fringe) continue;
      if (a.postId === this.postId) continue;
      msgs.push(
        `Este asociado está programado en el mismo turno y día en el puesto ${a.postName}.`,
      );
    }
    for (const a of this.monthConflictAlerts()) {
      if (a.type !== 'conflicto_mismo_turno') continue;
      if (a.associateId !== associateId || a.day !== day) continue;
      if (a.shift && a.shift !== fringe) continue;
      if (a.otherPostId === this.postId && a.postId !== this.postId) {
        msgs.push(
          `Este asociado está programado en el mismo turno y día en el puesto ${a.postName}.`,
        );
      }
    }

    const placements = this.boardAlerts()?.placements ?? [];
    for (const p of placements) {
      if (p.associateId !== associateId || p.day !== day || p.shift !== fringe) continue;
      if (p.postId === this.postId) continue;
      msgs.push(
        `Este asociado está programado en el mismo turno y día en el puesto ${p.postName}.`,
      );
    }

    return [...new Set(msgs)];
  }

  private commitCell(): void {
    const ctx = this.editing();
    if (!ctx) return;
    const config = this.codes.find((c) => c.codigo === this.editCodigo);
    const state: CellState = config
      ? {
          associateId: this.editAssociateId,
          jornada: config.jornada,
          codigo: config.codigo,
          turno: config.turno,
          inicio: this.editInicio || config.inicio,
          fin: this.editFin || config.fin,
        }
      : {
          associateId: this.editAssociateId,
          jornada: 'sin_asignar',
          codigo: null,
          turno: null,
          inicio: null,
          fin: null,
        };
    this.cells.update((map) => {
      const next = new Map(map);
      next.set(`${ctx.role.rol}:${ctx.day}`, state);
      return next;
    });
    this.dirty.set(true);
    this.editing.set(null);
    this.confirmOpen.set(false);
  }

  onConfirmOk(): void {
    const action = this.confirmAction;
    this.confirmAction = null;
    action?.();
  }

  onConfirmCancel(): void {
    this.confirmOpen.set(false);
    this.confirmAction = null;
    this.pendingSavePayload = null;
  }

  clearCell(): void {
    const ctx = this.editing();
    if (!ctx) return;
    this.cells.update((map) => {
      const next = new Map(map);
      next.delete(`${ctx.role.rol}:${ctx.day}`);
      return next;
    });
    this.dirty.set(true);
    this.editing.set(null);
  }

  cellLabel(role: string, day: number): string {
    return this.cells().get(`${role}:${day}`)?.codigo ?? '';
  }

  cellClass(role: string, day: number): string {
    const state = this.cells().get(`${role}:${day}`);
    const codigo = state?.codigo;
    const config = this.codes.find((c) => c.codigo === codigo);
    const base = config ? `cell ${config.cssClass}` : 'cell';

    if (!state?.associateId) return base;

    // Solo marcar alerta si este guardia específico tiene un cruce de turno en otro puesto
    const placements = this.boardAlerts()?.placements ?? [];
    const fringe = codigo === 'D' || codigo === 'D8' ? 'D' : codigo === 'N' || codigo === 'N8' ? 'N' : null;
    const hasConflict = placements.some(
      (p) => p.associateId === state.associateId && p.day === day && p.postId !== this.postId && (!fringe || p.shift === fringe)
    );

    if (hasConflict) return `${base} alert-error`;
    return base;
  }

  cellTitle(role: string, day: number): string {
    const state = this.cells().get(`${role}:${day}`);
    const alert = this.boardAlerts()?.cells.find((c) => c.day === day);
    const alertMsg = alert?.messages?.length ? ` | ${alert.messages.join(' · ')}` : '';
    if (!state) return `Sin asignar — clic para editar${alertMsg}`;
    const associate = state.associateId ? this.associateMap().get(state.associateId) : null;
    const name = associate ? this.associateName(associate) : 'Sin asociado';
    const hours =
      state.inicio && state.fin ? ` (${state.inicio}–${state.fin})` : '';
    return `${state.codigo ?? 'Sin asignar'}${hours} — ${name}${alertMsg}`;
  }

  associateName(a: Associate): string {
    const name = [a.firstName, a.lastName].filter(Boolean).join(' ');
    return name || a.documentNumber || '—';
  }

  titularName(role: PersonalRole): string {
    if (!role.associateId) return 'Sin titular';
    const a = this.associateMap().get(role.associateId);
    return a ? this.associateName(a) : 'Sin titular';
  }

  statusLabel(): string {
    const s = this.schedule()?.status;
    if (s === 'publicado') return 'Publicado';
    if (s === 'anulado') return 'Anulado';
    return 'Borrador';
  }

  monthLabel(): string {
    const [year, mon] = this.month.split('-').map(Number);
    return new Date(year, mon - 1, 1).toLocaleDateString('es-CO', {
      month: 'long',
      year: 'numeric',
    });
  }

  isWeekend(day: number): boolean {
    const [year, mon] = this.month.split('-').map(Number);
    const dow = new Date(year, mon - 1, day).getDay();
    return dow === 0 || dow === 6;
  }

  isSunday(day: number): boolean {
    const [year, mon] = this.month.split('-').map(Number);
    const dow = new Date(year, mon - 1, day).getDay();
    return dow === 0;
  }

  isSaturday(day: number): boolean {
    const [year, mon] = this.month.split('-').map(Number);
    const dow = new Date(year, mon - 1, day).getDay();
    return dow === 6;
  }

  isHoliday(day: number): boolean {
    return Boolean(this.holidayName(day));
  }

  dayOfWeekLetter(day: number): string {
    const [year, mon] = this.month.split('-').map(Number);
    const dow = new Date(year, mon - 1, day).getDay();
    const letters = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    return letters[dow];
  }

  dayTooltip(day: number): string {
    const [year, mon] = this.month.split('-').map(Number);
    const date = new Date(year, mon - 1, day);
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const hName = this.holidayName(day);
    const prefix = `${dayNames[date.getDay()]} ${day} de ${this.monthLabel()}`;
    return hName ? `⭐ ${prefix} — FESTIVO: ${hName}` : prefix;
  }

  private applySchedule(sched: MonthlySchedule | null): void {
    this.schedule.set(sched);
    if (!sched) {
      this.personal.set([]);
      this.cells.set(new Map());
      this.dirty.set(false);
      return;
    }
    this.personal.set(sched.personal.map((p) => ({ ...p })));
    const map = new Map<string, CellState>();
    for (const a of sched.assignments ?? []) {
      map.set(`${a.role}:${a.day}`, {
        associateId: a.associateId,
        jornada: a.jornada,
        codigo: a.codigo,
        turno: a.turno,
        inicio: a.inicio,
        fin: a.fin,
      });
    }
    this.cells.set(map);
    this.dirty.set(false);
  }

  private currentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
