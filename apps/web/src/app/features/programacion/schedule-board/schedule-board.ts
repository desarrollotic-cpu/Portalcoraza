import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Associate, AssociatesApiService } from '../../rrhh/associates-api.service';
import { SchedulingApiService } from '../scheduling-api.service';
import {
  Jornada,
  MonthlySchedule,
  MonthlySchedulingApiService,
  PersonalRole,
  ScheduleAssignment,
  Turno,
} from '../monthly-scheduling-api.service';

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
  { codigo: 'D', label: 'D — Diurno', jornada: 'normal', turno: 'AM', inicio: '06:00', fin: '18:00', cssClass: 'c-d' },
  { codigo: 'N', label: 'N — Nocturno', jornada: 'normal', turno: 'PM', inicio: '18:00', fin: '06:00', cssClass: 'c-n' },
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
  imports: [FormsModule],
  template: `
    <section>
      <header>
        <h2>Programación mensual por puesto</h2>
        <p>Tablero operativo: roles por día, motor de ciclo D/N/R/NR, borrador y publicación.</p>
        <div class="toolbar">
          <label>
            Puesto
            <select [(ngModel)]="postId" (ngModelChange)="onSelectionChange()">
              <option value="">Seleccione...</option>
              @for (p of posts(); track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
          </label>
          <label>
            Mes
            <input type="month" [(ngModel)]="month" (ngModelChange)="onSelectionChange()" />
          </label>
          @if (schedule()) {
            <span class="status" [class]="'st-' + schedule()!.status">{{ statusLabel() }}</span>
          }
        </div>
      </header>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (!postId) {
        <p>Selecciona un puesto y un mes para empezar.</p>
      } @else if (!schedule()) {
        <div class="empty-state">
          <p>No existe programación para este puesto en {{ monthLabel() }}.</p>
          <button type="button" class="primary" (click)="createSchedule()" [disabled]="saving()">
            Crear programación
          </button>
        </div>
      } @else {
        <div class="actions">
          <button type="button" (click)="runMotor()" [disabled]="saving()">
            Motor de ciclo D/N/R/NR
          </button>
          <button type="button" class="primary" (click)="save()" [disabled]="saving() || !dirty()">
            Guardar
          </button>
          @if (schedule()!.status !== 'publicado') {
            <button type="button" class="success" (click)="setStatus('publicado')" [disabled]="saving() || dirty()">
              Publicar
            </button>
          } @else {
            <button type="button" (click)="setStatus('borrador')" [disabled]="saving()">
              Volver a borrador
            </button>
          }
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
                <select [ngModel]="role.associateId" (ngModelChange)="updateRoleTitular(i, $event)">
                  <option [ngValue]="null">Sin titular</option>
                  @for (a of associates(); track a.id) {
                    <option [ngValue]="a.id">{{ associateName(a) }}</option>
                  }
                </select>
                <button type="button" class="danger sm" (click)="removeRole(i)">✕</button>
              </div>
            }
          </div>
          <button type="button" class="sm" (click)="addRole()">+ Agregar rol</button>
        </div>

        <div class="matrix-wrap">
          <table class="matrix">
            <thead>
              <tr>
                <th class="sticky-col">Rol / Titular</th>
                @for (day of days(); track day) {
                  <th [class.weekend]="isWeekend(day)">{{ day }}</th>
                }
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
                      [class.weekend]="isWeekend(day)"
                      (click)="openCell(role, day)"
                      [title]="cellTitle(role.rol, day)"
                    >
                      {{ cellLabel(role.rol, day) }}
                    </td>
                  }
                </tr>
              } @empty {
                <tr>
                  <td [attr.colspan]="days().length + 1">Agrega al menos un rol.</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="legend">
          @for (c of codes; track c.codigo) {
            <span class="badge" [class]="c.cssClass">{{ c.codigo }}</span>
          }
          <span class="hint">Clic en una celda para editarla</span>
        </div>
      }

      @if (editing()) {
        <div class="modal-backdrop" (click)="closeCell()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>Editar celda</h3>
            <p class="modal-sub">{{ editing()!.roleName }} — Día {{ editing()!.day }}</p>

            <label>
              Asociado
              <select [(ngModel)]="editAssociateId">
                <option [ngValue]="null">Sin asignar</option>
                @for (a of associates(); track a.id) {
                  <option [ngValue]="a.id">{{ associateName(a) }}</option>
                }
              </select>
            </label>

            <label>
              Código / estado
              <select [(ngModel)]="editCodigo">
                <option value="">Sin asignar</option>
                @for (c of codes; track c.codigo) {
                  <option [value]="c.codigo">{{ c.label }}</option>
                }
              </select>
            </label>

            <div class="modal-actions">
              <button type="button" (click)="closeCell()">Cancelar</button>
              <button type="button" class="danger" (click)="clearCell()">Vaciar</button>
              <button type="button" class="primary" (click)="applyCell()">Aplicar</button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    header h2 { margin: 0; color: var(--primary-dark); font-weight: 600; }
    header p { color: var(--coraza-text-muted); margin: 0.25rem 0 1rem; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 1rem; align-items: end; margin-bottom: 1rem; }
    label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
    select, input { padding: 0.45rem 0.6rem; border: 1px solid var(--coraza-border); border-radius: 8px; font: inherit; }
    .status { padding: 0.3rem 0.7rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; align-self: center; }
    .st-borrador { background: #fff3cd; color: #8a6d00; }
    .st-publicado { background: #d1e7dd; color: #0f5132; }
    .st-anulado { background: #f8d7da; color: #842029; }
    .actions { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: center; margin-bottom: 1rem; }
    button { padding: 0.5rem 0.9rem; border: 1px solid var(--coraza-border); border-radius: 8px; background: var(--coraza-surface); cursor: pointer; font: inherit; }
    button:hover:not(:disabled) { background: var(--primary-50); }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    button.primary { background: var(--primary-dark); color: #fff; border-color: var(--primary-dark); }
    button.success { background: #198754; color: #fff; border-color: #198754; }
    button.danger { background: #dc3545; color: #fff; border-color: #dc3545; }
    button.sm { padding: 0.3rem 0.6rem; font-size: 0.8rem; }
    .empty-state { padding: 2rem; text-align: center; border: 1px dashed var(--coraza-border); border-radius: 12px; }
    .roles-panel { margin-bottom: 1rem; padding: 1rem; border: 1px solid var(--coraza-border); border-radius: 12px; background: var(--coraza-surface); }
    .roles-panel h3 { margin: 0 0 0.75rem; font-size: 0.95rem; }
    .roles-grid { display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem; }
    .role-row { display: grid; grid-template-columns: 1fr 1.5fr auto; gap: 0.5rem; align-items: center; }
    .role-name { width: 100%; }
    .matrix-wrap { overflow: auto; max-height: 65vh; border: 1px solid var(--coraza-border); border-radius: 8px; }
    .matrix { border-collapse: collapse; min-width: 100%; font-size: 0.75rem; }
    th, td { border: 1px solid var(--coraza-border); padding: 0.35rem; text-align: center; min-width: 30px; }
    th { background: var(--primary-50); position: sticky; top: 0; z-index: 1; }
    th.weekend, td.weekend { background: #fafafa; }
    .sticky-col { position: sticky; left: 0; background: var(--coraza-surface); text-align: left; min-width: 170px; z-index: 2; }
    .role-label { font-weight: 600; }
    .role-titular { color: var(--coraza-text-muted); font-size: 0.7rem; }
    .cell { cursor: pointer; user-select: none; font-weight: 600; }
    .cell:hover { outline: 2px solid var(--primary-dark); outline-offset: -2px; }
    .c-d { background: #d1e7dd; color: #0f5132; }
    .c-n { background: #cfe2ff; color: #084298; }
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
    .modal-actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem; }
  `,
})
export class ScheduleBoard implements OnInit {
  private readonly api = inject(MonthlySchedulingApiService);
  private readonly schedulingApi = inject(SchedulingApiService);
  private readonly associatesApi = inject(AssociatesApiService);

  readonly codes = CODES;

  readonly posts = signal<{ id: string; name: string }[]>([]);
  readonly associates = signal<Associate[]>([]);
  readonly schedule = signal<MonthlySchedule | null>(null);
  readonly personal = signal<PersonalRole[]>([]);
  readonly cells = signal<Map<string, CellState>>(new Map());

  postId = '';
  month = this.currentMonth();

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly dirty = signal(false);
  readonly error = signal<string | null>(null);

  readonly editing = signal<{ role: PersonalRole; roleName: string; day: number } | null>(null);
  editAssociateId: string | null = null;
  editCodigo = '';

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

  ngOnInit(): void {
    this.schedulingApi.listPosts().subscribe({
      next: (posts) => this.posts.set(posts),
      error: () => this.error.set('No se pudieron cargar los puestos'),
    });
    this.associatesApi.list('ACTIVO').subscribe({
      next: (list) => this.associates.set(list),
      error: () => this.error.set('No se pudieron cargar los asociados'),
    });
  }

  onSelectionChange(): void {
    this.editing.set(null);
    this.loadSchedule();
  }

  private loadSchedule(): void {
    if (!this.postId || !this.month) {
      this.schedule.set(null);
      return;
    }
    const [year, mon] = this.month.split('-').map(Number);
    this.loading.set(true);
    this.error.set(null);
    this.api.getOne(this.postId, year, mon).subscribe({
      next: (sched) => {
        this.applySchedule(sched);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar la programación');
      },
    });
  }

  createSchedule(): void {
    if (!this.postId || !this.month) return;
    const [year, mon] = this.month.split('-').map(Number);
    this.saving.set(true);
    this.api.createOrGet(this.postId, year, mon).subscribe({
      next: (sched) => {
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
    const sched = this.schedule();
    if (!sched) return;
    if (this.dirty() && !confirm('Se sobrescribirán las celdas actuales. ¿Continuar?')) return;
    this.saving.set(true);
    this.api.generateMotor(sched.id).subscribe({
      next: (updated) => {
        this.applySchedule(updated);
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo ejecutar el motor de ciclo');
      },
    });
  }

  save(): void {
    const sched = this.schedule();
    if (!sched) return;
    this.saving.set(true);
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

    this.api.save(sched.id, { personal: this.personal(), assignments }).subscribe({
      next: (updated) => {
        this.applySchedule(updated);
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
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

  openCell(role: PersonalRole, day: number): void {
    const state = this.cells().get(`${role.rol}:${day}`);
    this.editAssociateId = state?.associateId ?? role.associateId ?? null;
    this.editCodigo = state?.codigo ?? '';
    this.editing.set({ role, roleName: role.displayName || role.rol, day });
  }

  closeCell(): void {
    this.editing.set(null);
  }

  applyCell(): void {
    const ctx = this.editing();
    if (!ctx) return;
    const config = this.codes.find((c) => c.codigo === this.editCodigo);
    const state: CellState = config
      ? {
          associateId: this.editAssociateId,
          jornada: config.jornada,
          codigo: config.codigo,
          turno: config.turno,
          inicio: config.inicio,
          fin: config.fin,
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
    const codigo = this.cells().get(`${role}:${day}`)?.codigo;
    const config = this.codes.find((c) => c.codigo === codigo);
    return config ? `cell ${config.cssClass}` : 'cell';
  }

  cellTitle(role: string, day: number): string {
    const state = this.cells().get(`${role}:${day}`);
    if (!state) return 'Sin asignar — clic para editar';
    const associate = state.associateId ? this.associateMap().get(state.associateId) : null;
    const name = associate ? this.associateName(associate) : 'Sin asociado';
    return `${state.codigo ?? 'Sin asignar'} — ${name}`;
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
    for (const a of sched.assignments as ScheduleAssignment[]) {
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
