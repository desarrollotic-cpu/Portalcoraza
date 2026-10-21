import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { HrPageHeader } from '../../../shared/components/hr-page-header/hr-page-header';
import { ToastService } from '../../../shared/services/toast.service';

export type SanctionType = 'SUSPENSION' | 'LLAMADO_ATENCION' | 'PECUNIARIA';
export type SanctionStatus = 'PROGRAMADA' | 'VIGENTE' | 'CUMPLIDA' | 'ANULADA';

export interface Numeral {
  id: string;
  numeral: string;
  descripcion: string;
  /** Por vez (1.ª a 4.ª): >0 días de suspensión, 0 llamada de atención, -1 no aplica, -2 pecuniaria. */
  diasPorVez: number[];
  activo: boolean;
}

export const VECES = [
  { v: 1, label: 'Primera vez' },
  { v: 2, label: 'Segunda vez' },
  { v: 3, label: 'Tercera vez' },
  { v: 4, label: 'Cuarta vez' },
];

export const vezLabel = (v: number) => VECES.find((x) => x.v === v)?.label ?? `${v}.ª vez`;

export type Kind = 'DIAS' | 'LLAMADO' | 'PECUNIARIA' | 'NO_APLICA';
export const newNf = () => ({
  numeral: '',
  descripcion: '',
  kinds: ['DIAS', 'DIAS', 'DIAS', 'DIAS'] as Kind[],
  dias: [1, 1, 1, 1],
});
const toCode = (k: Kind, d: number) => (k === 'DIAS' ? Math.max(Math.trunc(Number(d)) || 1, 1) : k === 'LLAMADO' ? 0 : k === 'PECUNIARIA' ? -2 : -1);
const fromCode = (c: number): { k: Kind; d: number } =>
  c > 0 ? { k: 'DIAS', d: c } : c === 0 ? { k: 'LLAMADO', d: 1 } : c === -2 ? { k: 'PECUNIARIA', d: 1 } : { k: 'NO_APLICA', d: 1 };

export const NO_APLICA = -1;
export const PECUNIARIA = -2;
export const codigoDe = (n: Numeral, vez: number) => n.diasPorVez?.[vez - 1] ?? NO_APLICA;
export const sancionLabel = (c: number) =>
  c > 0 ? `${c} día${c > 1 ? 's' : ''} de suspensión` : c === 0 ? 'Llamada de atención por escrito' : c === PECUNIARIA ? 'Sanción pecuniaria' : 'No aplica';
/** Qué sanción se aplicó (para el listado). */
export const sancionDe = (r: { tipo: SanctionType; dias: number }) =>
  r.tipo === 'SUSPENSION' ? sancionLabel(r.dias) : r.tipo === 'PECUNIARIA' ? sancionLabel(PECUNIARIA) : sancionLabel(0);

export interface Sanction {
  id: string;
  associateId: string;
  associate?: { firstName: string; firstLastName: string; documentNumber: string; folderNumber?: number | null };
  numeral: string;
  descripcion: string;
  ocurrencia: number;
  tipo: SanctionType;
  dias: number;
  startDate: string;
  endDate: string;
  motivo: string | null;
  status: SanctionStatus;
  annulReason: string | null;
}

interface AssociateHit {
  id: string;
  documentNumber: string;
  fullName: string;
  status: string;
}

export const STATUS_COLOR: Record<SanctionStatus, string> = {
  PROGRAMADA: 'amber',
  VIGENTE: 'red',
  CUMPLIDA: 'green',
  ANULADA: 'gray',
};

/** Último día de la sanción (inicio + días - 1) y día en que vuelve a trabajar. */
export function fechas(start: string, dias: number): { fin: string; vuelve: string } | null {
  if (!start) return null;
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.max(dias, 1) - 1);
  const fin = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + 1);
  return { fin, vuelve: d.toISOString().slice(0, 10) };
}

/**
 * Sanciones disciplinarias: se elige el numeral del reglamento (que ya trae los días)
 * y la fecha de inicio. El portal suspende al asociado mientras dura la sanción y lo
 * devuelve a Activo cuando termina.
 */
@Component({
  selector: 'app-sanctions-panel',
  imports: [CommonModule, FormsModule, RouterLink, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header
        title="Sanciones disciplinarias"
        subtitle="La suspensión se aplica y se levanta sola según las fechas"
      >
        @if (canCreate() && tab() === 'sanciones') {
          <button actions type="button" class="hr-btn hr-btn-primary" (click)="openForm()">Nueva sanción</button>
        }
      </app-hr-page-header>

      <div class="hr-filters">
        <button type="button" class="hr-btn" [class.hr-btn-primary]="tab() === 'sanciones'" (click)="tab.set('sanciones')">
          Sanciones
        </button>
        @if (canManage()) {
          <button type="button" class="hr-btn" [class.hr-btn-primary]="tab() === 'numerales'" (click)="tab.set('numerales')">
            Escala de sanciones
          </button>
        }
      </div>

      @if (tab() === 'sanciones') {
        @if (showForm()) {
          <div class="hr-detail-card">
            <h3>Registrar sanción</h3>
            <div class="hr-form-grid-3">
              <div class="hr-field">
                <label>Asociado *</label>
                @if (picked(); as p) {
                  <div>
                    <strong>{{ p.fullName }}</strong> · {{ p.documentNumber }}
                    <button type="button" class="hr-btn hr-btn-ghost" (click)="picked.set(null)">Cambiar</button>
                  </div>
                } @else {
                  <input type="search" placeholder="Cédula o nombre..." [ngModel]="q" (ngModelChange)="onSearch($event)" />
                  @for (h of hits(); track h.id) {
                    <button type="button" class="hr-btn hr-btn-ghost" style="display:block;text-align:left" (click)="pick(h)">
                      {{ h.fullName }} · {{ h.documentNumber }}
                    </button>
                  }
                }
              </div>
              <div class="hr-field">
                <label>Numeral *</label>
                <select [(ngModel)]="numeralId" (ngModelChange)="onNumeral()">
                  <option value="">Seleccione…</option>
                  @for (n of activeNumerals(); track n.id) {
                    <option [value]="n.id">
                      {{ n.numeral }} — {{ n.descripcion }}
                    </option>
                  }
                </select>
              </div>
              <div class="hr-field">
                <label>Vez *</label>
                <select [(ngModel)]="vez">
                  @for (o of vecesDe(); track o.v) {
                    <option [ngValue]="o.v">{{ o.label }} — {{ sancionLabel(o.code) }}</option>
                  }
                </select>
              </div>
              <div class="hr-field">
                <label>Primer día de la sanción *</label>
                <input type="date" [(ngModel)]="startDate" />
              </div>
            </div>
            <div class="hr-field">
              <label>Motivo / observaciones</label>
              <textarea rows="2" [(ngModel)]="motivo"></textarea>
            </div>
            @if (preview(); as pv) {
              <p class="hr-muted">
                <strong>{{ sancionLabel(pv.code) }}.</strong>
                @if (pv.code === -1) {
                  Este numeral no tiene sanción definida para esa vez.
                } @else if (pv.code > 0 && pv.fin) {
                  Suspendido del <strong>{{ startDate }}</strong> al <strong>{{ pv.fin }}</strong>.
                  Vuelve a trabajar el <strong>{{ pv.vuelve }}</strong> y pasa a Activo automáticamente.
                } @else if (pv.code <= 0) {
                  Queda registrada, no suspende.
                }
              </p>
            }
            <div style="display:flex;gap:.5rem">
              <button type="button" class="hr-btn hr-btn-primary" [disabled]="saving() || preview()?.code === -1" (click)="save()">
                {{ saving() ? 'Guardando…' : 'Registrar' }}
              </button>
              <button type="button" class="hr-btn hr-btn-ghost" (click)="showForm.set(false)">Cancelar</button>
            </div>
          </div>
        }

        <div class="hr-filters">
          <input type="search" placeholder="Buscar por cédula, nombre o numeral..." [(ngModel)]="search" (ngModelChange)="load()" />
          <select [(ngModel)]="statusFilter" (ngModelChange)="load()">
            <option value="">Todos los estados</option>
            <option value="PROGRAMADA">Programada</option>
            <option value="VIGENTE">Vigente</option>
            <option value="CUMPLIDA">Cumplida</option>
            <option value="ANULADA">Anulada</option>
          </select>
        </div>

        @if (loading()) {
          <div class="hr-loading">Cargando sanciones...</div>
        } @else if (rows().length === 0) {
          <div class="hr-empty-state"><p>Sin sanciones registradas.</p></div>
        } @else {
          <div class="hr-detail-card" style="overflow-x:auto">
            <table class="hr-table">
              <thead>
                <tr>
                  <th>Asociado</th><th>Numeral</th><th>Descripción de la falta</th><th>Vez</th><th>Inicio</th><th>Fin</th><th>Sanción</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (r of rows(); track r.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/rrhh/asociados', r.associateId]" class="hr-link">
                        {{ r.associate?.firstName }} {{ r.associate?.firstLastName }}
                      </a>
                      <div class="hr-muted">{{ r.associate?.documentNumber }}</div>
                    </td>
                    <td>
                      <strong>{{ r.numeral }}</strong>
                    </td>
                    <td>
                      {{ r.descripcion }}
                      @if (r.motivo) { <div class="hr-muted">{{ r.motivo }}</div> }
                    </td>
                    <td>{{ vezLabel(r.ocurrencia) }}</td>
                    <td>{{ r.startDate }}</td>
                    <td>{{ r.tipo === 'SUSPENSION' ? r.endDate : '—' }}</td>
                    <td>{{ sancionDe(r) }}</td>
                    <td>
                      <span class="hr-status" [attr.data-color]="color(r.status)">{{ r.status }}</span>
                      @if (r.annulReason) { <div class="hr-muted">{{ r.annulReason }}</div> }
                    </td>
                    <td>
                      @if (canCreate() && r.status !== 'ANULADA') {
                        <button type="button" class="hr-btn hr-btn-ghost" (click)="annul(r)">Anular</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      } @else {
        <div class="hr-detail-card">
          <h3>{{ editingId() ? 'Editar numeral' : 'Nuevo numeral' }}</h3>
          <div class="hr-form-grid-3">
            <div class="hr-field"><label>Numeral *</label><input [(ngModel)]="nf.numeral" placeholder="Ej. 1" /></div>
          </div>
          <div class="hr-form-grid-3">
            @for (o of veces; track o.v) {
              <div class="hr-field">
                <label>{{ o.label }} *</label>
                <select [(ngModel)]="nf.kinds[o.v - 1]">
                  <option value="DIAS">Suspensión (días)</option>
                  <option value="LLAMADO">Llamada de atención por escrito</option>
                  <option value="PECUNIARIA">Sanción pecuniaria</option>
                  <option value="NO_APLICA">No aplica</option>
                </select>
                @if (nf.kinds[o.v - 1] === 'DIAS') {
                  <input type="number" min="1" max="365" placeholder="Días" [(ngModel)]="nf.dias[o.v - 1]" />
                }
              </div>
            }
          </div>
          <div class="hr-field"><label>Descripción *</label><textarea rows="2" [(ngModel)]="nf.descripcion"></textarea></div>
          <div style="display:flex;gap:.5rem">
            <button type="button" class="hr-btn hr-btn-primary" [disabled]="saving()" (click)="saveNumeral()">Guardar</button>
            @if (editingId()) {
              <button type="button" class="hr-btn hr-btn-ghost" (click)="resetNf()">Cancelar</button>
            }
          </div>
        </div>
        <div class="hr-detail-card" style="overflow-x:auto">
          <table class="hr-table">
            <thead><tr><th>Numeral</th><th>Descripción de la falta</th>@for (o of veces; track o.v) {<th>{{ o.label }}</th>}<th>Activo</th><th></th></tr></thead>
            <tbody>
              @for (n of numerals(); track n.id) {
                <tr>
                  <td><strong>{{ n.numeral }}</strong></td>
                  <td>{{ n.descripcion }}</td>
                  @for (d of n.diasPorVez; track $index) {
                    <td>{{ sancionLabel(d) }}</td>
                  }
                  <td>{{ n.activo ? 'Sí' : 'No' }}</td>
                  <td>
                    <button type="button" class="hr-btn hr-btn-ghost" (click)="editNumeral(n)">Editar</button>
                    <button type="button" class="hr-btn hr-btn-ghost" (click)="toggleNumeral(n)">{{ n.activo ? 'Desactivar' : 'Activar' }}</button>
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="hr-muted">Aún no hay numerales: cargue los del reglamento interno.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
})
export class SanctionsPanel implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly api = `${environment.apiUrl}/hr/sanctions`;

  readonly canCreate = computed(() => this.auth.hasPermission('sanctions.create'));
  readonly canManage = computed(() => this.auth.hasPermission('sanctions.manage'));

  readonly tab = signal<'sanciones' | 'numerales'>('sanciones');
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly rows = signal<Sanction[]>([]);
  readonly numerals = signal<Numeral[]>([]);
  readonly activeNumerals = computed(() => this.numerals().filter((n) => n.activo));
  readonly showForm = signal(false);
  readonly picked = signal<AssociateHit | null>(null);
  readonly hits = signal<AssociateHit[]>([]);
  readonly editingId = signal<string | null>(null);

  search = '';
  statusFilter = '';
  q = '';
  numeralId = '';
  startDate = ''; // sin valor por defecto: quien sanciona debe escribirla
  motivo = '';
  vez = 1;
  nf = newNf();
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly veces = VECES;
  readonly vezLabel = vezLabel;
  readonly sancionLabel = sancionLabel;
  readonly sancionDe = sancionDe;
  readonly color = (s: SanctionStatus) => STATUS_COLOR[s];

  /** Código de sanción del numeral elegido para la vez `v` (null si aún no hay numeral). */
  codigo(v: number): number | null {
    const n = this.numerals().find((x) => x.id === this.numeralId);
    return n ? codigoDe(n, v) : null;
  }

  vecesDe() {
    return VECES.map((o) => ({ ...o, code: this.codigo(o.v) })).filter(
      (o): o is { v: number; label: string; code: number } => o.code !== null && o.code !== NO_APLICA,
    );
  }

  onNumeral(): void {
    this.vez = this.vecesDe()[0]?.v ?? 1;
  }

  preview() {
    const code = this.codigo(this.vez);
    if (code === null) return null;
    return { code, ...fechas(this.startDate, Math.max(code, 0)) };
  }

  ngOnInit(): void {
    this.loadNumerals();
    this.load();
  }

  load(): void {
    let params = new HttpParams();
    if (this.search.trim()) params = params.set('search', this.search.trim());
    if (this.statusFilter) params = params.set('status', this.statusFilter);
    this.loading.set(true);
    this.http.get<Sanction[]>(this.api, { params }).subscribe({
      next: (r) => { this.rows.set(r); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('No se pudieron cargar las sanciones'); },
    });
  }

  private loadNumerals(): void {
    const params = new HttpParams().set('all', this.canManage() ? '1' : '0');
    this.http.get<Numeral[]>(`${this.api}/numerals`, { params }).subscribe({
      next: (r) => this.numerals.set(r),
      error: () => this.toast.error('No se pudo cargar el catálogo de numerales'),
    });
  }

  openForm(): void {
    this.picked.set(null);
    this.hits.set([]);
    this.q = '';
    this.numeralId = '';
    this.vez = 1;
    this.startDate = '';
    this.motivo = '';
    this.showForm.set(true);
  }

  onSearch(v: string): void {
    this.q = v;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      if (v.trim().length < 2) return this.hits.set([]);
      this.http
        .get<AssociateHit[]>(`${this.api}/associate-search`, { params: new HttpParams().set('q', v.trim()) })
        .subscribe({ next: (r) => this.hits.set(r), error: () => this.toast.error('No se pudo buscar el asociado') });
    }, 300);
  }

  pick(h: AssociateHit): void {
    this.picked.set(h);
    this.hits.set([]);
  }

  save(): void {
    const p = this.picked();
    if (!p || !this.numeralId || !this.startDate) {
      this.toast.error('Elige el asociado, el numeral y el primer día de la sanción');
      return;
    }
    this.saving.set(true);
    this.http
      .post(this.api, { associateId: p.id, numeralId: this.numeralId, ocurrencia: this.vez, startDate: this.startDate, motivo: this.motivo || undefined })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showForm.set(false);
          this.toast.success('Sanción registrada');
          this.load();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error('No se pudo registrar', err.error?.message ?? '');
        },
      });
  }

  annul(r: Sanction): void {
    const reason = window.prompt('Motivo de la anulación (mínimo 5 caracteres):');
    if (!reason || reason.trim().length < 5) return;
    this.http.post(`${this.api}/${r.id}/annul`, { reason }).subscribe({
      next: () => { this.toast.success('Sanción anulada'); this.load(); },
      error: (err) => this.toast.error('No se pudo anular', err.error?.message ?? ''),
    });
  }

  // ─── Numerales ───
  resetNf(): void {
    this.editingId.set(null);
    this.nf = newNf();
  }

  editNumeral(n: Numeral): void {
    this.editingId.set(n.id);
    const p = n.diasPorVez.map(fromCode);
    this.nf = { numeral: n.numeral, descripcion: n.descripcion, kinds: p.map((x) => x.k), dias: p.map((x) => x.d) };
  }

  saveNumeral(): void {
    const body = {
      numeral: this.nf.numeral,
      descripcion: this.nf.descripcion,
      diasPorVez: this.nf.kinds.map((k, i) => toCode(k, this.nf.dias[i])),
    };
    const id = this.editingId();
    this.saving.set(true);
    const req = id ? this.http.patch(`${this.api}/numerals/${id}`, body) : this.http.post(`${this.api}/numerals`, body);
    req.subscribe({
      next: () => { this.saving.set(false); this.resetNf(); this.toast.success('Numeral guardado'); this.loadNumerals(); },
      error: (err) => { this.saving.set(false); this.toast.error('No se pudo guardar', err.error?.message ?? ''); },
    });
  }

  toggleNumeral(n: Numeral): void {
    this.http.patch(`${this.api}/numerals/${n.id}`, { activo: !n.activo }).subscribe({
      next: () => this.loadNumerals(),
      error: (err) => this.toast.error('No se pudo cambiar', err.error?.message ?? ''),
    });
  }
}
