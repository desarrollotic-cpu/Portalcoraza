import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, computed, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { codigoDe, fechas, NO_APLICA, Numeral, Sanction, sancionDe, sancionLabel, STATUS_COLOR, VECES, vezLabel } from './sanctions-panel';

/**
 * Pestaña «Sanciones disciplinarias» de la ficha del asociado. Se elige el numeral
 * (que ya trae los días) y el primer día; el portal lo suspende y lo reactiva solo.
 * Las sanciones no se editan: quedan como registro del asociado.
 */
@Component({
  selector: 'app-associate-sanctions-tab',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="hr-tab-panel">
      @if (canCreate()) {
        <div class="hr-detail-card">
          <h3>Registrar sanción</h3>
          <div class="hr-form-grid-3">
            <div class="hr-field">
              <label>Numeral *</label>
              <select [(ngModel)]="numeralId" (ngModelChange)="onNumeral()">
                <option value="">Seleccione…</option>
                @for (n of numerals(); track n.id) {
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
          <button type="button" class="hr-btn hr-btn-primary" [disabled]="saving() || preview()?.code === -1" (click)="save()">
            {{ saving() ? 'Guardando…' : 'Registrar sanción' }}
          </button>
        </div>
      }

      <div class="hr-detail-card">
        <h3>Historial de sanciones</h3>
        @if (rows().length === 0) {
          <p class="hr-empty">Sin sanciones registradas.</p>
        } @else {
          <table class="hr-table">
            <thead>
              <tr><th>Numeral</th><th>Descripción de la falta</th><th>Vez</th><th>Inicio</th><th>Fin</th><th>Sanción</th><th>Estado</th></tr>
            </thead>
            <tbody>
              @for (r of rows(); track r.id) {
                <tr>
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
                  <td><span class="hr-status" [attr.data-color]="color(r.status)">{{ r.status }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </section>
  `,
})
export class AssociateSanctionsTab implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly api = `${environment.apiUrl}/hr/sanctions`;

  readonly associateId = input.required<string>();
  /** Avisa al padre para recargar la ficha: el estado del asociado puede haber cambiado. */
  readonly changed = output<void>();

  readonly canCreate = computed(() => this.auth.hasPermission('sanctions.create'));
  readonly numerals = signal<Numeral[]>([]);
  readonly rows = signal<Sanction[]>([]);
  readonly saving = signal(false);

  numeralId = '';
  vez = 1;
  startDate = ''; // sin valor por defecto: quien sanciona debe escribirla
  motivo = '';

  readonly veces = VECES;
  readonly vezLabel = vezLabel;
  readonly sancionLabel = sancionLabel;
  readonly sancionDe = sancionDe;
  readonly color = (s: Sanction['status']) => STATUS_COLOR[s];

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
    this.http.get<Numeral[]>(`${this.api}/numerals`).subscribe({
      next: (r) => this.numerals.set(r),
      error: () => this.toast.error('No se pudo cargar el catálogo de numerales'),
    });
    this.load();
  }

  private load(): void {
    this.http
      .get<Sanction[]>(this.api, { params: new HttpParams().set('associateId', this.associateId()) })
      .subscribe({ next: (r) => this.rows.set(r), error: () => {} });
  }

  save(): void {
    if (!this.numeralId || !this.startDate) {
      this.toast.error('Elige el numeral y el primer día de la sanción');
      return;
    }
    this.saving.set(true);
    this.http
      .post(this.api, {
        associateId: this.associateId(),
        numeralId: this.numeralId,
        ocurrencia: this.vez,
        startDate: this.startDate,
        motivo: this.motivo || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.numeralId = '';
          this.vez = 1;
          this.startDate = '';
          this.motivo = '';
          this.toast.success('Sanción registrada');
          this.load();
          this.changed.emit();
        },
        error: (err) => {
          this.saving.set(false);
          this.toast.error('No se pudo registrar', err.error?.message ?? '');
        },
      });
  }
}
