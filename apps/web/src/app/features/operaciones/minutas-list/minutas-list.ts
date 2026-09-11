import { DatePipe } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideEye } from '@lucide/angular';
import { Icon } from '../../../shared/components/icon/icon';
import { MinutaDetalleDialog } from '../../minuta/minuta-detalle-dialog/minuta-detalle-dialog';
import {
  OperacionesApiService,
  OperacionesMinutaRow,
  OperacionesPost,
  OperacionesPostConMinuta,
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
            Busca el puesto por nombre, consulta el mes y revisa novedades o PDF.
            Abajo: puestos que ya tienen Minuta Virtual creada.
          </p>
        </div>
      </header>

      <section class="minuta-cards">
        <header class="minuta-cards__head">
          <h3>Cuentas activas de Minuta Virtual ({{ postsConMinuta().length }})</h3>
          <p>
            Usuarios con rol Puesto. Si tiene puesto asignado, haz clic para consultarlo.
          </p>
        </header>
        @if (accountsLoading()) {
          <p class="empty">Cargando cuentas…</p>
        } @else if (accountsError()) {
          <p class="error">{{ accountsError() }}</p>
        } @else if (!postsConMinuta().length) {
          <p class="empty">
            No hay cuentas Puesto activas. Créalas en Administración → Usuarios (rol Puesto + puesto).
          </p>
        } @else {
          <div class="minuta-cards__grid">
            @for (p of postsConMinuta(); track p.userId) {
              <button
                type="button"
                class="minuta-card"
                [class.active]="p.id === postId"
                [class.unassigned]="!p.assigned"
                [disabled]="!p.assigned"
                (click)="pickPostFromCard(p)"
                [title]="p.assigned ? 'Consultar este puesto' : 'Sin puesto asignado en el portal'"
              >
                <strong>{{ p.name || p.fullName || 'Sin puesto' }}</strong>
                <span>
                  @if (p.assigned) {
                    {{ p.code }} · {{ p.status }}
                  } @else {
                    Sin puesto asignado
                  }
                </span>
                <span class="email">{{ p.loginEmail }}</span>
              </button>
            }
          </div>
        }
      </section>

      <form class="filters" (ngSubmit)="consultar()">
        <label class="post-search">
          Puesto *
          <div class="combo">
            <input
              type="search"
              name="postSearch"
              [ngModel]="postSearch()"
              (ngModelChange)="onPostSearch($event)"
              (focus)="openDropdown()"
              placeholder="Escribe nombre o código del puesto…"
              autocomplete="off"
            />
            @if (dropdownOpen()) {
              <div class="combo-panel" role="listbox">
                @for (p of filteredPosts().slice(0, 40); track p.id) {
                  <button type="button" class="combo-item" (mousedown)="selectPost($event, p)">
                    <strong>{{ p.name }}</strong>
                    <span>{{ p.code }}</span>
                  </button>
                } @empty {
                  <p class="combo-empty">Sin puestos con “{{ postSearch() }}”</p>
                }
              </div>
            }
          </div>
        </label>
        <label>
          Mes *
          <input type="month" name="month" [(ngModel)]="month" required />
        </label>
        <div class="actions">
          <button type="submit" class="primary" [disabled]="loading() || !postId">
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
    .minuta-cards {
      border: 1px solid var(--border, #e2e8f0);
      border-radius: 12px;
      background: var(--surface, #fff);
      padding: 0.9rem 1rem 1rem;
      display: grid;
      gap: 0.75rem;
    }
    .minuta-cards__head h3 { margin: 0; font-size: 0.95rem; }
    .minuta-cards__head p { margin: 0.2rem 0 0; font-size: 0.82rem; color: var(--muted, #64748b); }
    .minuta-cards__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 0.55rem;
      max-height: 220px;
      overflow: auto;
    }
    .minuta-card {
      display: grid;
      gap: 0.15rem;
      text-align: left;
      padding: 0.65rem 0.75rem;
      border-radius: 10px;
      border: 1px solid var(--border, #e2e8f0);
      background: var(--surface-2, #f8fafc);
      cursor: pointer;
      font: inherit;
    }
    .minuta-card strong { font-size: 0.88rem; color: #0f172a; }
    .minuta-card span { font-size: 0.75rem; color: #64748b; }
    .minuta-card .email { font-size: 0.72rem; word-break: break-all; }
    .minuta-card:hover:not(:disabled) { border-color: #99f6e4; background: #f0fdfa; }
    .minuta-card.active { border-color: #0f766e; background: #ccfbf1; }
    .minuta-card.unassigned {
      opacity: 0.85;
      cursor: not-allowed;
      border-style: dashed;
    }
    .minuta-card:disabled { transform: none; }
    .filters {
      display: flex; flex-wrap: wrap; gap: 0.85rem; align-items: end;
      padding: 0.85rem 1rem; border: 1px solid var(--border, #e2e8f0);
      border-radius: 10px; background: var(--surface, #fff);
    }
    label { display: grid; gap: 0.3rem; font-size: 0.85rem; font-weight: 600; }
    .post-search { flex: 1 1 18rem; min-width: 16rem; }
    .combo { position: relative; }
    .combo input[type='search'], input[type='month'] {
      width: 100%; min-width: 14rem; padding: 0.45rem 0.6rem; border-radius: 8px;
      border: 1px solid var(--border, #cbd5e1); background: transparent; font: inherit;
    }
    .combo-panel {
      position: absolute; z-index: 20; left: 0; right: 0; top: calc(100% + 4px);
      max-height: 260px; overflow: auto; border: 1px solid var(--border, #e2e8f0);
      border-radius: 10px; background: #fff; box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
    }
    .combo-item {
      width: 100%; display: flex; justify-content: space-between; gap: 0.75rem;
      text-align: left; padding: 0.55rem 0.75rem; border: 0; border-bottom: 1px solid #f1f5f9;
      background: transparent; cursor: pointer; font: inherit;
    }
    .combo-item:hover { background: #f0fdfa; }
    .combo-item span { color: #64748b; font-size: 0.8rem; }
    .combo-empty { margin: 0; padding: 0.75rem; color: #64748b; font-size: 0.85rem; }
    .actions { display: flex; gap: 0.5rem; }
    button.primary, button.ghost, button.eye {
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
      border-radius: 8px; color: #0c4a6e;
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
      .combo input[type='search'], input[type='month'] { min-width: 0; width: 100%; }
      .filters { flex-direction: column; align-items: stretch; }
      .actions { width: 100%; }
      .actions button { flex: 1; }
      .minuta-cards__grid { max-height: 280px; }
    }
  `,
})
export class MinutasList implements OnInit {
  private readonly api = inject(OperacionesApiService);
  readonly icons = { Eye: LucideEye };

  readonly posts = signal<OperacionesPost[]>([]);
  readonly postsConMinuta = signal<OperacionesPostConMinuta[]>([]);
  readonly accountsLoading = signal(true);
  readonly accountsError = signal<string | null>(null);
  readonly postSearch = signal('');
  readonly dropdownOpen = signal(false);
  readonly rows = signal<OperacionesMinutaRow[]>([]);
  readonly loaded = signal(false);
  readonly loading = signal(false);
  readonly pdfLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly postLabel = signal('');
  readonly detalle = signal<OperacionesMinutaRow | null>(null);

  postId = '';
  month = '';
  /** Evita que al elegir un puesto el ngModelChange reabra el desplegable. */
  private syncingSelection = false;

  readonly filteredPosts = computed(() => {
    const q = this.postSearch().trim().toLowerCase();
    const list = this.posts();
    if (!q) return list.slice(0, 40);
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.clientName ?? '').toLowerCase().includes(q),
    );
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    const t = ev.target as HTMLElement | null;
    if (!t?.closest?.('.post-search')) {
      this.dropdownOpen.set(false);
    }
  }

  ngOnInit(): void {
    const now = new Date();
    this.month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.api.listPosts().subscribe({
      next: (list) =>
        this.posts.set(
          list
            .filter((p) => p.status === 'ACTIVO')
            .sort((a, b) => a.name.localeCompare(b.name, 'es')),
        ),
      error: () => this.error.set('No se pudieron cargar los puestos'),
    });
    this.api.listPostsConMinuta().subscribe({
      next: (list) => {
        this.postsConMinuta.set(list);
        this.accountsLoading.set(false);
      },
      error: () => {
        this.accountsLoading.set(false);
        this.accountsError.set('No se pudieron cargar las cuentas de Minuta Virtual');
      },
    });
  }

  openDropdown(): void {
    if (!this.syncingSelection) this.dropdownOpen.set(true);
  }

  onPostSearch(value: string): void {
    if (this.syncingSelection) return;
    this.postSearch.set(value);
    this.dropdownOpen.set(true);
    const exact = this.posts().find(
      (p) => `${p.code} — ${p.name}`.toLowerCase() === value.trim().toLowerCase(),
    );
    if (!exact) this.postId = '';
  }

  selectPost(ev: Event, p: OperacionesPost | OperacionesPostConMinuta): void {
    ev.preventDefault();
    ev.stopPropagation();
    if (!('id' in p) || !p.id) return;
    this.syncingSelection = true;
    this.postId = p.id;
    const label =
      'code' in p && p.code && p.name
        ? `${p.code} — ${p.name}`
        : (p as OperacionesPost).name;
    this.postSearch.set(label);
    this.dropdownOpen.set(false);
    setTimeout(() => {
      this.syncingSelection = false;
    }, 0);
  }

  pickPostFromCard(p: OperacionesPostConMinuta): void {
    if (!p.assigned || !p.id) return;
    this.syncingSelection = true;
    this.postId = p.id;
    this.postSearch.set(`${p.code} — ${p.name}`);
    this.dropdownOpen.set(false);
    setTimeout(() => {
      this.syncingSelection = false;
    }, 0);
    if (this.month) this.consultar();
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
