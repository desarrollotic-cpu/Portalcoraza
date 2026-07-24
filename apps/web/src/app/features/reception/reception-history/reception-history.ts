import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { ToastService } from '../../../shared/services/toast.service';
import { ModalShell } from '../../dotacion/modal-shell/modal-shell';
import { ReceptionApiService, ReceptionVisitor } from '../reception-api.service';

@Component({
  selector: 'app-reception-history',
  imports: [DatePipe, FormsModule, ModalShell, ConfirmDialog],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Historial de visitas</h2>
          <p>Consulta permanente de ingresos y salidas registrados en recepción.</p>
        </div>
        <div class="head-actions">
          <button type="button" class="primary" (click)="openPdfModal()">Generar PDF</button>
          <button type="button" class="ghost" (click)="reload()">Actualizar</button>
        </div>
      </header>

      <div class="filter">
        <label>
          Buscar
          <input
            type="search"
            placeholder="Nombre, cédula, motivo, origen..."
            [ngModel]="search()"
            (ngModelChange)="search.set($event)"
          />
        </label>
        <label>
          Estado
          <select [ngModel]="status()" (ngModelChange)="status.set($event)">
            <option value="all">Todos</option>
            <option value="inside">Dentro</option>
            <option value="closed">Con salida</option>
          </select>
        </label>
        <strong>{{ filtered().length }} registro(s)</strong>
      </div>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Visitante</th>
              <th>Ingreso</th>
              <th>Salida</th>
              <th>Motivo / autorizado</th>
              <th>Datos personales</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (v of filtered(); track v.id) {
              <tr>
                <td>
                  <strong>{{ v.displayName }}</strong>
                  @if (v.documentNumber) {
                    <div class="meta">C.C. {{ v.documentNumber }}</div>
                  }
                  <span class="badge" [class.inside]="v.isInside">
                    {{ v.isInside ? 'Dentro' : 'Cerrado' }}
                  </span>
                </td>
                <td>
                  <div>{{ v.entryAt | date: 'dd/MM/yyyy' }}</div>
                  <div class="meta">{{ v.entryAt | date: 'HH:mm:ss' }}</div>
                </td>
                <td>
                  @if (v.exitAt) {
                    <div>{{ v.exitAt | date: 'dd/MM/yyyy' }}</div>
                    <div class="meta strong">{{ v.exitAt | date: 'HH:mm:ss' }}</div>
                    <div class="meta">Permanencia: {{ durationLabel(v) }}</div>
                    @if (v.exitNotes) {
                      <div class="meta">{{ v.exitNotes }}</div>
                    }
                  } @else {
                    <span class="muted">Sin salida</span>
                  }
                </td>
                <td>
                  {{ v.visitReason || '—' }}
                  @if (v.authorizedBy) {
                    <div class="meta">Autorizó: {{ v.authorizedBy }}</div>
                  }
                  @if (v.originPlace) {
                    <div class="meta">Viene de: {{ v.originPlace }}</div>
                  }
                </td>
                <td>
                  @if (v.sex) {
                    <div>Sexo: {{ sexLabel(v.sex) }}</div>
                  }
                  @if (v.birthDate) {
                    <div>Fecha nac.: {{ v.birthDate }}</div>
                  }
                  @if (v.arl) {
                    <div>ARL: {{ v.arl }}</div>
                  }
                  @if (v.eps) {
                    <div>EPS: {{ v.eps }}</div>
                  }
                  @if (v.transportMeans || v.travelTimeMinutes !== null) {
                    <div>
                      Despl.: {{ transportLabel(v.transportMeans) }}
                      @if (v.travelTimeMinutes !== null) {
                        · {{ v.travelTimeMinutes }} min
                      }
                    </div>
                  }
                </td>
                <td class="actions">
                  @if (v.isInside && auth.hasPermission('reception.exit')) {
                    <button
                      type="button"
                      class="btn-sm"
                      [disabled]="exiting()"
                      (click)="askExit(v)"
                    >
                      Dar salida
                    </button>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="empty">No hay visitas para mostrar.</td>
              </tr>
            }
          </tbody>
        </table>
      }

      <app-modal-shell
        [open]="pdfOpen()"
        title="Generar PDF del historial"
        (closed)="closePdfModal()"
      >
        <p class="hint">Elige el rango de fechas de ingreso. El PDF se descarga automáticamente.</p>
        <div class="pdf-form">
          <label>
            Desde
            <input type="date" [(ngModel)]="pdfFrom" name="pdfFrom" />
          </label>
          <label>
            Hasta
            <input type="date" [(ngModel)]="pdfTo" name="pdfTo" />
          </label>
        </div>
        @if (pdfError()) {
          <p class="error">{{ pdfError() }}</p>
        }
        <div class="pdf-actions">
          <button type="button" class="ghost" (click)="closePdfModal()" [disabled]="pdfSaving()">
            Cancelar
          </button>
          <button type="button" class="primary" (click)="generatePdf()" [disabled]="pdfSaving()">
            {{ pdfSaving() ? 'Generando...' : 'Generar' }}
          </button>
        </div>
      </app-modal-shell>

      <app-confirm-dialog
        [open]="!!pendingExit()"
        title="Dar salida"
        [message]="
          pendingExit()
            ? '¿Registrar la salida de ' + pendingExit()!.displayName + '?'
            : ''
        "
        detail="El registro se actualizará en esta misma lista."
        confirmLabel="Sí, dar salida"
        [busy]="exiting()"
        busyLabel="Registrando…"
        [danger]="true"
        (confirmed)="confirmExit()"
        (cancelled)="closeExit()"
      />
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1rem; }
    .head, .filter, .head-actions, .pdf-actions {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
      align-items: end;
    }
    .head h2 { margin: 0 0 0.3rem; color: var(--primary-dark); font-size: 1.25rem; }
    .head p { margin: 0; color: var(--text-secondary); font-size: 0.9rem; }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: min(280px, 100%);
      font-size: 0.82rem;
      color: var(--text-secondary);
    }
    input, select {
      padding: 0.5rem 0.65rem;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      font: inherit;
      background: var(--surface);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--coraza-surface);
      border: 1px solid var(--coraza-border);
      border-radius: 12px;
      overflow: hidden;
      font-size: 0.86rem;
    }
    th, td {
      text-align: left;
      padding: 0.65rem 0.75rem;
      border-bottom: 1px solid var(--coraza-border);
      vertical-align: top;
    }
    th {
      background: var(--primary-50);
      font-size: 0.72rem;
      text-transform: uppercase;
      color: var(--primary-dark);
    }
    .meta, .muted { color: var(--text-secondary); }
    .meta { margin-top: 0.15rem; font-size: 0.78rem; }
    .meta.strong { font-weight: 700; color: var(--text-primary); }
    .badge {
      display: inline-block;
      margin-top: 0.3rem;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: var(--neutral-100);
      color: var(--neutral-600);
      font-size: 0.72rem;
      font-weight: 700;
    }
    .badge.inside { background: color-mix(in srgb, #16a34a 12%, var(--surface)); color: #15803d; }
    .actions { text-align: right; white-space: nowrap; }
    .btn-sm {
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, #dc2626 35%, #fecaca);
      background: color-mix(in srgb, #dc2626 8%, var(--surface));
      color: #b91c1c;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
    }
    .ghost, .primary {
      padding: 0.45rem 0.9rem;
      border-radius: 999px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
    }
    .ghost {
      border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--coraza-border));
      background: color-mix(in srgb, var(--primary) 8%, var(--surface));
      color: var(--primary-dark);
    }
    .primary {
      border: 1px solid var(--primary);
      background: var(--primary);
      color: #fff;
    }
    .primary:disabled, .ghost:disabled { opacity: 0.55; cursor: not-allowed; }
    .hint { margin: 0 0 0.85rem; color: var(--text-secondary); font-size: 0.9rem; }
    .pdf-form {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.85rem;
      margin-bottom: 1rem;
    }
    .pdf-actions { justify-content: flex-end; }
    .empty { color: var(--text-secondary); }
    .error { color: var(--coraza-error); }
  `,
})
export class ReceptionHistory implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ReceptionApiService);
  private readonly toast = inject(ToastService);

  readonly visitors = signal<ReceptionVisitor[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly status = signal<'all' | 'inside' | 'closed'>('all');
  readonly pendingExit = signal<ReceptionVisitor | null>(null);
  readonly exiting = signal(false);

  readonly pdfOpen = signal(false);
  readonly pdfSaving = signal(false);
  readonly pdfError = signal<string | null>(null);
  pdfFrom = '';
  pdfTo = '';

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const status = this.status();
    return this.visitors().filter((v) => {
      const statusMatch =
        status === 'all' ||
        (status === 'inside' && v.isInside) ||
        (status === 'closed' && !v.isInside);
      if (!statusMatch) return false;
      if (!q) return true;
      return [
        v.displayName,
        v.documentNumber,
        v.originPlace,
        v.visitReason,
        v.authorizedBy,
        v.arl,
        v.eps,
        v.transportMeans,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  });

  ngOnInit(): void {
    this.reload();
  }

  openPdfModal(): void {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    this.pdfFrom = this.toInputDate(monthStart);
    this.pdfTo = this.toInputDate(today);
    this.pdfError.set(null);
    this.pdfOpen.set(true);
  }

  closePdfModal(): void {
    if (this.pdfSaving()) return;
    this.pdfOpen.set(false);
    this.pdfError.set(null);
  }

  generatePdf(): void {
    if (!this.pdfFrom || !this.pdfTo) {
      this.pdfError.set('Indica la fecha desde y hasta');
      return;
    }
    if (this.pdfFrom > this.pdfTo) {
      this.pdfError.set('La fecha "desde" no puede ser posterior a "hasta"');
      return;
    }

    this.pdfSaving.set(true);
    this.pdfError.set(null);
    this.api.downloadHistoryPdf(this.pdfFrom, this.pdfTo).subscribe({
      next: (blob) => {
        this.pdfSaving.set(false);
        if (blob.type && blob.type.includes('json')) {
          this.pdfError.set('No se pudo generar el PDF');
          return;
        }
        this.api.triggerDownload(
          blob,
          `historial-visitas-${this.pdfFrom}_a_${this.pdfTo}.pdf`,
        );
        this.pdfOpen.set(false);
      },
      error: async (err) => {
        this.pdfSaving.set(false);
        let message = 'No se pudo generar el PDF';
        const body = err?.error;
        if (body instanceof Blob) {
          try {
            const text = await body.text();
            const parsed = JSON.parse(text) as { message?: string | string[] };
            if (typeof parsed.message === 'string') message = parsed.message;
            else if (Array.isArray(parsed.message)) message = parsed.message.join(', ');
          } catch {
            /* keep default */
          }
        } else if (typeof body?.message === 'string') {
          message = body.message;
        }
        this.pdfError.set(message);
      },
    });
  }

  reload(): void {
    this.loading.set(true);
    this.api.listVisitors(false).subscribe({
      next: (visitors) => {
        this.visitors.set(visitors);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el historial de visitas');
      },
    });
  }

  askExit(v: ReceptionVisitor): void {
    this.pendingExit.set(v);
  }

  closeExit(): void {
    if (this.exiting()) return;
    this.pendingExit.set(null);
  }

  confirmExit(): void {
    const v = this.pendingExit();
    if (!v || this.exiting()) return;
    this.exiting.set(true);
    this.api.registerExit(v.id).subscribe({
      next: (saved) => {
        this.visitors.update((list) => list.map((row) => (row.id === saved.id ? saved : row)));
        this.exiting.set(false);
        this.pendingExit.set(null);
        const hora = saved.exitAt
          ? new Date(saved.exitAt).toLocaleTimeString('es-CO', { timeStyle: 'short' })
          : '';
        this.toast.success(
          'Salida registrada',
          hora ? `${saved.displayName} · ${hora}` : saved.displayName,
        );
      },
      error: (err) => {
        this.exiting.set(false);
        this.toast.error(err?.error?.message ?? 'No se pudo registrar la salida');
      },
    });
  }

  durationLabel(v: ReceptionVisitor): string {
    if (!v.exitAt) return '—';
    const ms = new Date(v.exitAt).getTime() - new Date(v.entryAt).getTime();
    if (ms < 0) return '—';
    const totalMin = Math.round(ms / 60000);
    if (totalMin < 60) return `${totalMin} min`;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  sexLabel(value: ReceptionVisitor['sex']): string {
    switch (value) {
      case 'M':
        return 'Masculino';
      case 'F':
        return 'Femenino';
      case 'OTRO':
        return 'Otro';
      case 'NO_DECLARA':
        return 'No declara';
      default:
        return '—';
    }
  }

  transportLabel(value: ReceptionVisitor['transportMeans']): string {
    switch (value) {
      case 'MOTO':
        return 'Moto';
      case 'CARRO':
        return 'Carro';
      case 'TRANSPORTE_PUBLICO':
        return 'Transporte público';
      case 'OTRO':
        return 'Otro';
      case 'NINGUNO':
        return 'Ninguno / a pie';
      default:
        return '—';
    }
  }

  private toInputDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
