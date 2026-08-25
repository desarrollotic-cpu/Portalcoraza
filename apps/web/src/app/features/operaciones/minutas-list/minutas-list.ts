import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideEye } from '@lucide/angular';
import { Icon } from '../../../shared/components/icon/icon';
import { MinutaDetalleDialog } from '../../minuta/minuta-detalle-dialog/minuta-detalle-dialog';
import {
  OperacionesApiService,
  OperacionesMinutaRow,
  OperacionesPost,
} from '../operaciones-api.service';

@Component({
  selector: 'app-minutas-list',
  imports: [FormsModule, DatePipe, MinutaDetalleDialog, Icon],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Minutas virtuales</h2>
          <p>
            Consulta de novedades registradas por puesto. Elige puesto y mes (obligatorios) para
            ver el historial o descargar PDF. Usa el ojo para el detalle completo.
          </p>
        </div>
      </header>

      <form class="filters" (ngSubmit)="consultar()">
        <label>
          Puesto *
          <select name="postId" [(ngModel)]="postId" required>
            <option value="">Seleccione…</option>
            @for (p of posts(); track p.id) {
              <option [value]="p.id">{{ p.code }} — {{ p.name }}</option>
            }
          </select>
        </label>
        <label>
          Mes *
          <input type="month" name="month" [(ngModel)]="month" required />
        </label>
        <div class="actions">
          <button type="submit" class="primary" [disabled]="loading()">
            {{ loading() ? 'Cargando…' : 'Consultar' }}
          </button>
          <button
            type="button"
            class="ghost"
            (click)="descargarPdf()"
            [disabled]="pdfLoading() || !postId || !month"
          >
            {{ pdfLoading() ? 'Generando…' : 'Descargar PDF' }}
          </button>
        </div>
      </form>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      @if (loaded()) {
        <p class="meta">
          {{ postLabel() }} · {{ month }} · {{ rows().length }} registro(s)
        </p>
        @if (!rows().length) {
          <p class="empty">No hay minutas para ese puesto y mes.</p>
        } @else {
          <div class="table-wrap desktop">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>ID</th>
                  <th>Estado</th>
                  <th>Registra</th>
                  <th>Resumen</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (r of rows(); track r.id + r.tipo) {
                  <tr>
                    <td>{{ r.fecha | date: 'dd/MM/yyyy HH:mm' }}</td>
                    <td>{{ r.tipo }}</td>
                    <td>{{ r.id }}</td>
                    <td>{{ r.estado }}</td>
                    <td>{{ r.registradoPor }}</td>
                    <td>{{ r.resumen }}</td>
                    <td>
                      <button
                        type="button"
                        class="eye"
                        (click)="openDetalle(r)"
                        title="Ver detalle"
                        aria-label="Ver detalle"
                      >
                        <app-icon [icon]="icons.Eye" [size]="16" [strokeWidth]="2" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="cards mobile">
            @for (r of rows(); track r.id + r.tipo) {
              <article class="card">
                <div class="card-top">
                  <strong>{{ r.tipo }}</strong>
                  <button
                    type="button"
                    class="eye"
                    (click)="openDetalle(r)"
                    title="Ver detalle"
                    aria-label="Ver detalle"
                  >
                    <app-icon [icon]="icons.Eye" [size]="16" [strokeWidth]="2" />
                  </button>
                </div>
                <p class="muted">{{ r.fecha | date: 'dd/MM/yyyy HH:mm' }} · {{ r.estado }}</p>
                <p class="muted">Registra: {{ r.registradoPor }}</p>
                <p>{{ r.resumen }}</p>
              </article>
            }
          </div>
        }
      }
    </section>

    <app-minuta-detalle-dialog
      [open]="!!detalle()"
      [title]="detalleTitle()"
      [subtitle]="detalleSubtitle()"
      [fields]="detalleFields()"
      (closed)="detalle.set(null)"
    />
  `,
  styles: `
    .page { display: grid; gap: 1rem; }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
    .head p { margin: 0; color: var(--muted, #64748b); font-size: 0.95rem; }
    .filters {
      display: flex; flex-wrap: wrap; gap: 0.85rem; align-items: end;
      padding: 0.85rem 1rem; border: 1px solid var(--border, #e2e8f0);
      border-radius: 10px; background: var(--surface, #fff);
    }
    label { display: grid; gap: 0.3rem; font-size: 0.85rem; font-weight: 600; }
    select, input[type='month'] {
      min-width: 14rem; padding: 0.45rem 0.6rem; border-radius: 8px;
      border: 1px solid var(--border, #cbd5e1); background: transparent;
    }
    .actions { display: flex; gap: 0.5rem; }
    button {
      border: 0; border-radius: 8px; padding: 0.5rem 0.9rem; cursor: pointer; font-weight: 600;
    }
    button:disabled { opacity: 0.55; cursor: not-allowed; }
    .primary { background: #0f766e; color: #fff; }
    .ghost { background: transparent; border: 1px solid var(--border, #cbd5e1); }
    .error { color: #b91c1c; margin: 0; }
    .meta { margin: 0; font-size: 0.9rem; color: var(--muted, #64748b); }
    .empty { margin: 0; color: var(--muted, #64748b); }
    .table-wrap { overflow: auto; border: 1px solid var(--border, #e2e8f0); border-radius: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.55rem 0.75rem; border-bottom: 1px solid var(--border, #e2e8f0); }
    th { background: var(--surface-2, #f8fafc); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.03em; }
    td:nth-child(6) { max-width: 22rem; }
    .eye {
      display: inline-flex; align-items: center; justify-content: center;
      width: 2.1rem; height: 2.1rem; padding: 0;
      border: 1px solid var(--border, #cbd5e1); background: transparent;
      border-radius: 8px; color: #1e3a8a;
    }
    .cards { display: none; flex-direction: column; gap: 0.65rem; }
    .card {
      border: 1px solid var(--border, #e2e8f0); border-radius: 12px;
      padding: 0.75rem; background: var(--surface, #fff);
      display: grid; gap: 0.25rem;
    }
    .card-top { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
    .muted { margin: 0; font-size: 0.82rem; color: var(--muted, #64748b); }
    .card p:last-child { margin: 0.25rem 0 0; font-size: 0.9rem; }
    @media (max-width: 800px) {
      .desktop { display: none; }
      .cards.mobile { display: flex; }
      select, input[type='month'] { min-width: 0; width: 100%; }
      .filters { flex-direction: column; align-items: stretch; }
      .actions { width: 100%; }
      .actions button { flex: 1; }
    }
  `,
})
export class MinutasList implements OnInit {
  private readonly api = inject(OperacionesApiService);
  readonly icons = { Eye: LucideEye };

  readonly posts = signal<OperacionesPost[]>([]);
  readonly rows = signal<OperacionesMinutaRow[]>([]);
  readonly loaded = signal(false);
  readonly loading = signal(false);
  readonly pdfLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly postLabel = signal('');
  readonly detalle = signal<OperacionesMinutaRow | null>(null);

  postId = '';
  month = '';

  ngOnInit(): void {
    const now = new Date();
    this.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.api.listPosts().subscribe({
      next: (list) =>
        this.posts.set(
          list
            .filter((p) => p.status === 'ACTIVO')
            .sort((a, b) => a.code.localeCompare(b.code)),
        ),
      error: () => this.error.set('No se pudieron cargar los puestos'),
    });
  }

  openDetalle(r: OperacionesMinutaRow): void {
    this.detalle.set(r);
  }

  detalleTitle(): string {
    const r = this.detalle();
    return r ? `Detalle · ${r.tipo}` : 'Detalle';
  }

  detalleSubtitle(): string | null {
    const r = this.detalle();
    if (!r) return null;
    const when = new Date(r.fecha);
    const fechaTxt = Number.isNaN(when.getTime())
      ? r.fecha
      : when.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    return `${r.id} · ${r.estado} · ${fechaTxt}`;
  }

  detalleFields(): Record<string, unknown> {
    const r = this.detalle();
    if (!r) return {};
    return {
      ...(r.detalles || {}),
      resumen: r.resumen,
      registradoPor: r.registradoPor,
      estado: r.estado,
    };
  }

  consultar(): void {
    this.error.set(null);
    if (!this.postId || !this.month) {
      this.error.set('Seleccione puesto y mes');
      return;
    }
    this.loading.set(true);
    this.api.minutaHistorial(this.postId, this.month).subscribe({
      next: (res) => {
        this.rows.set(res.historial);
        this.postLabel.set(`${res.post.code} — ${res.post.name}`);
        this.loaded.set(true);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.message || 'No se pudo consultar el historial');
      },
    });
  }

  descargarPdf(): void {
    this.error.set(null);
    if (!this.postId || !this.month) {
      this.error.set('Seleccione puesto y mes');
      return;
    }
    this.pdfLoading.set(true);
    this.api.downloadMinutaPdf(this.postId, this.month).subscribe({
      next: (blob) => {
        this.pdfLoading.set(false);
        if (!blob || blob.size === 0 || blob.type.includes('json')) {
          this.error.set('No se pudo generar el PDF');
          return;
        }
        const post = this.posts().find((p) => p.id === this.postId);
        const code = post?.code || 'puesto';
        this.api.triggerDownload(blob, `minuta-${code}-${this.month}.pdf`);
      },
      error: () => {
        this.pdfLoading.set(false);
        this.error.set('No se pudo generar el PDF');
      },
    });
  }
}
