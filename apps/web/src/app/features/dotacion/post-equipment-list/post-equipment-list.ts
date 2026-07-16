import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ModalShell } from '../modal-shell/modal-shell';
import {
  PostEquipmentApiService,
  PostEquipmentAssignment,
  PostEquipmentPostDetail,
  PostEquipmentPostSummary,
  PostEquipmentUnit,
} from '../post-equipment-api.service';
import { PostEquipmentTabs } from '../post-equipment-tabs/post-equipment-tabs';

@Component({
  selector: 'app-post-equipment-list',
  imports: [FormsModule, DatePipe, PostEquipmentTabs, ModalShell],
  template: `
    <section class="dot-page">
      <app-post-equipment-tabs />

      <header class="page-head">
        <div>
          <h2>Entregar a puestos</h2>
          <p>
            Busca un puesto y entrega elementos disponibles. Al terminar el puesto, retira las
            unidades o dalas de baja si se perdieron o dañaron.
          </p>
        </div>
      </header>

      <div class="filter-bar">
        <label>
          Buscar puesto
          <input
            type="search"
            placeholder="Nombre, código o zona..."
            [ngModel]="search()"
            (ngModelChange)="search.set($event)"
          />
        </label>
        <span class="muted">{{ filtered().length }} puesto(s)</span>
      </div>

      @if (loading()) {
        <p>Cargando puestos...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Puesto / cliente</th>
                <th>Zona</th>
                <th>Elementos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (p of filtered(); track p.id) {
                <tr>
                  <td><span class="code">{{ p.code }}</span></td>
                  <td>
                    <strong>{{ p.name }}</strong>
                    @if (p.clientName && p.clientName !== p.name) {
                      <div class="meta">{{ p.clientName }}</div>
                    }
                  </td>
                  <td>{{ p.zone ?? '—' }}</td>
                  <td>
                    <span class="badge" [class.warn]="p.assignedItems > 0">
                      {{ p.assignedItems }}
                    </span>
                  </td>
                  <td class="actions">
                    @if (auth.hasPermission('post_equipment.assign')) {
                      <button type="button" class="hr-btn hr-btn-primary btn-sm" (click)="openDeliver(p)">
                        Entregar
                      </button>
                    }
                    <button type="button" class="hr-btn hr-btn-ghost btn-sm" (click)="openHistory(p)">
                      Historial
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="empty">
                    No hay puestos que coincidan. Los puestos los crea RRHH en centros de trabajo.
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Modal entrega -->
      <app-modal-shell
        [open]="!!deliverPost()"
        [title]="deliverPost() ? 'Entregar a ' + deliverPost()!.name : 'Entregar'"
        (closed)="closeDeliver()"
      >
        @if (deliverLoading()) {
          <p>Cargando disponibles...</p>
        } @else {
          <p class="hint">Selecciona las unidades disponibles para entregar a este puesto.</p>
          @if (available().length === 0) {
            <p class="empty">No hay unidades disponibles. Créalas en Inventario de elementos.</p>
          } @else {
            <div class="unit-list">
              @for (u of available(); track u.id) {
                <label class="unit-row">
                  <input
                    type="checkbox"
                    [checked]="selectedUnitIds().has(u.id)"
                    (change)="toggleUnit(u.id, $event)"
                  />
                  <span>
                    <strong>{{ u.catalogName }}</strong>
                    <span class="meta">{{ u.unitCode }}</span>
                  </span>
                </label>
              }
            </div>
            <label class="field">
              Condición
              <select [(ngModel)]="deliverCondition" name="cond">
                <option value="">—</option>
                <option value="BUENO">Bueno</option>
                <option value="REGULAR">Regular</option>
                <option value="MALO">Malo</option>
              </select>
            </label>
            <label class="field">
              Notas
              <input [(ngModel)]="deliverNotes" name="notes" />
            </label>
            @if (deliverError()) {
              <p class="error">{{ deliverError() }}</p>
            }
            <div class="modal-actions">
              <button type="button" class="hr-btn hr-btn-ghost" (click)="closeDeliver()">Cancelar</button>
              <button
                type="button"
                class="hr-btn hr-btn-primary"
                [disabled]="deliverSaving() || selectedUnitIds().size === 0"
                (click)="confirmDeliver()"
              >
                {{ deliverSaving() ? 'Entregando...' : 'Confirmar entrega (' + selectedUnitIds().size + ')' }}
              </button>
            </div>
          }
        }
      </app-modal-shell>

      <!-- Modal historial / retirar / baja -->
      <app-modal-shell
        [open]="!!historyPost()"
        [title]="historyPost() ? 'Historial — ' + historyPost()!.name : 'Historial'"
        (closed)="closeHistory()"
      >
        @if (historyLoading()) {
          <p>Cargando...</p>
        } @else if (historyDetail(); as d) {
          <h4 class="sub">En el puesto ahora</h4>
          <table class="inner">
            <thead>
              <tr>
                <th>Elemento</th>
                <th>Código</th>
                <th>Entregado</th>
                @if (auth.hasPermission('post_equipment.return')) {
                  <th></th>
                }
              </tr>
            </thead>
            <tbody>
              @for (a of assignedOf(d); track a.id) {
                <tr>
                  <td>{{ a.displayName }}</td>
                  <td>{{ a.unitCode ?? '—' }}</td>
                  <td>{{ a.deliveredAt | date: 'shortDate' }}</td>
                  @if (auth.hasPermission('post_equipment.return')) {
                    <td class="actions">
                      <button type="button" class="btn-sm" (click)="closeItem(a, 'RETURNED')">
                        Retirar
                      </button>
                      <button type="button" class="btn-sm danger" (click)="closeItem(a, 'LOST')">
                        Perdido
                      </button>
                      <button type="button" class="btn-sm danger" (click)="closeItem(a, 'WRITTEN_OFF')">
                        Dar de baja
                      </button>
                    </td>
                  }
                </tr>
              } @empty {
                <tr>
                  <td [attr.colspan]="auth.hasPermission('post_equipment.return') ? 4 : 3">
                    Sin elementos en este puesto.
                  </td>
                </tr>
              }
            </tbody>
          </table>

          <h4 class="sub">Cerrados</h4>
          <table class="inner">
            <thead>
              <tr>
                <th>Elemento</th>
                <th>Estado</th>
                <th>Entregado</th>
                <th>Cerrado</th>
              </tr>
            </thead>
            <tbody>
              @for (a of historyOf(d); track a.id) {
                <tr>
                  <td>{{ a.displayName }}</td>
                  <td>{{ statusLabel(a.status) }}</td>
                  <td>{{ a.deliveredAt | date: 'shortDate' }}</td>
                  <td>{{ a.returnedAt ? (a.returnedAt | date: 'shortDate') : '—' }}</td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="4">Sin historial cerrado.</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </app-modal-shell>
    </section>
  `,
  styles: `
    .page-head { margin-bottom: 1rem; }
    .page-head h2 { margin: 0 0 0.35rem; color: var(--primary-dark); font-size: 1.25rem; }
    .page-head p { margin: 0; color: var(--coraza-text-muted, #64748b); max-width: 42rem; font-size: 0.9rem; }
    .filter-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: end;
      margin-bottom: 1rem;
    }
    .filter-bar label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.85rem;
      color: #64748b;
    }
    .filter-bar input {
      min-width: 260px;
      padding: 0.5rem 0.7rem;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      font: inherit;
    }
    .muted { color: #64748b; font-size: 0.85rem; }
    .table-wrap {
      border: 1px solid var(--coraza-border);
      border-radius: 10px;
      overflow: auto;
      background: var(--coraza-surface, #fff);
    }
    table { width: 100%; border-collapse: collapse; }
    th, td {
      padding: 0.7rem 0.85rem;
      border-bottom: 1px solid var(--coraza-border);
      text-align: left;
      vertical-align: middle;
    }
    th {
      background: var(--primary-50);
      font-size: 0.72rem;
      text-transform: uppercase;
      color: var(--primary-dark);
    }
    .code {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--primary);
      letter-spacing: 0.03em;
    }
    .meta { font-size: 0.78rem; color: #64748b; }
    .badge {
      display: inline-block;
      min-width: 1.6rem;
      text-align: center;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      background: #f1f5f9;
      font-weight: 700;
      font-size: 0.8rem;
    }
    .badge.warn { background: color-mix(in srgb, #f59e0b 16%, #fff); color: #b45309; }
    .actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .btn-sm { padding: 0.35rem 0.65rem; font-size: 0.78rem; }
    .hint { margin: 0 0 0.75rem; font-size: 0.85rem; color: #64748b; }
    .unit-list {
      max-height: 280px;
      overflow: auto;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      margin-bottom: 0.85rem;
    }
    .unit-row {
      display: flex;
      gap: 0.65rem;
      align-items: center;
      padding: 0.55rem 0.75rem;
      border-bottom: 1px solid var(--coraza-border);
      cursor: pointer;
    }
    .unit-row:last-child { border-bottom: none; }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-bottom: 0.65rem;
      font-size: 0.85rem;
      color: #64748b;
    }
    .field input, .field select {
      padding: 0.5rem 0.65rem;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      font: inherit;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
    .sub { margin: 1rem 0 0.5rem; font-size: 0.95rem; color: var(--primary-dark); }
    .sub:first-child { margin-top: 0; }
    table.inner { margin-bottom: 0.5rem; border: 1px solid var(--coraza-border); border-radius: 8px; overflow: hidden; }
    .btn-sm {
      padding: 0.28rem 0.55rem;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--coraza-border));
      background: color-mix(in srgb, var(--primary) 8%, #fff);
      color: var(--primary-dark);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-sm.danger {
      border-color: color-mix(in srgb, #dc2626 35%, #fecaca);
      background: color-mix(in srgb, #dc2626 8%, #fff);
      color: #b91c1c;
    }
    .error { color: var(--coraza-error); }
    .empty { color: #64748b; }
  `,
})
export class PostEquipmentList implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(PostEquipmentApiService);

  readonly posts = signal<PostEquipmentPostSummary[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');

  readonly deliverPost = signal<PostEquipmentPostSummary | null>(null);
  readonly available = signal<PostEquipmentUnit[]>([]);
  readonly selectedUnitIds = signal(new Set<string>());
  readonly deliverLoading = signal(false);
  readonly deliverSaving = signal(false);
  readonly deliverError = signal<string | null>(null);
  deliverCondition = '';
  deliverNotes = '';

  readonly historyPost = signal<PostEquipmentPostSummary | null>(null);
  readonly historyDetail = signal<PostEquipmentPostDetail | null>(null);
  readonly historyLoading = signal(false);

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const rows = this.posts();
    if (!q) return rows;
    return rows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.clientName ?? '').toLowerCase().includes(q) ||
        (p.zone ?? '').toLowerCase().includes(q),
    );
  });

  ngOnInit(): void {
    this.reloadPosts();
  }

  openDeliver(p: PostEquipmentPostSummary): void {
    this.deliverPost.set(p);
    this.selectedUnitIds.set(new Set());
    this.deliverCondition = '';
    this.deliverNotes = '';
    this.deliverError.set(null);
    this.deliverLoading.set(true);
    this.api.listAvailableUnits().subscribe({
      next: (units) => {
        this.available.set(units);
        this.deliverLoading.set(false);
      },
      error: () => {
        this.deliverLoading.set(false);
        this.deliverError.set('No se pudieron cargar las unidades disponibles');
      },
    });
  }

  closeDeliver(): void {
    this.deliverPost.set(null);
    this.available.set([]);
  }

  toggleUnit(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const next = new Set(this.selectedUnitIds());
    if (checked) next.add(id);
    else next.delete(id);
    this.selectedUnitIds.set(next);
  }

  confirmDeliver(): void {
    const post = this.deliverPost();
    if (!post || this.selectedUnitIds().size === 0) return;
    this.deliverSaving.set(true);
    this.deliverError.set(null);
    this.api
      .bulkAssign({
        postId: post.id,
        unitIds: [...this.selectedUnitIds()],
        conditionOnDelivery: this.deliverCondition || undefined,
        notes: this.deliverNotes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.deliverSaving.set(false);
          this.closeDeliver();
          this.reloadPosts();
        },
        error: (err) => {
          this.deliverSaving.set(false);
          this.deliverError.set(err?.error?.message ?? 'No se pudo completar la entrega');
        },
      });
  }

  openHistory(p: PostEquipmentPostSummary): void {
    this.historyPost.set(p);
    this.historyDetail.set(null);
    this.historyLoading.set(true);
    this.api.getPostDetail(p.id).subscribe({
      next: (detail) => {
        this.historyDetail.set(detail);
        this.historyLoading.set(false);
      },
      error: () => {
        this.historyLoading.set(false);
      },
    });
  }

  closeHistory(): void {
    this.historyPost.set(null);
    this.historyDetail.set(null);
  }

  assignedOf(d: PostEquipmentPostDetail): PostEquipmentAssignment[] {
    return d.assignments.filter((a) => a.status === 'ASSIGNED');
  }

  historyOf(d: PostEquipmentPostDetail): PostEquipmentAssignment[] {
    return d.assignments.filter((a) => a.status !== 'ASSIGNED');
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'RETURNED':
        return 'Retirado / devuelto';
      case 'LOST':
        return 'Perdido';
      case 'WRITTEN_OFF':
        return 'Dado de baja';
      default:
        return status;
    }
  }

  closeItem(a: PostEquipmentAssignment, status: 'RETURNED' | 'LOST' | 'WRITTEN_OFF'): void {
    const labels = {
      RETURNED: 'retirar (devolver a la cooperativa)',
      LOST: 'marcar como perdido',
      WRITTEN_OFF: 'dar de baja',
    };
    if (!window.confirm(`¿Seguro que deseas ${labels[status]} "${a.displayName}"?`)) return;

    this.api.returnAssignment(a.id, { status }).subscribe({
      next: () => {
        const post = this.historyPost();
        if (post) this.openHistory(post);
        this.reloadPosts();
      },
      error: (err) => {
        window.alert(err?.error?.message ?? 'No se pudo completar la acción');
      },
    });
  }

  private reloadPosts(): void {
    this.loading.set(true);
    this.api.listPosts().subscribe({
      next: (posts) => {
        this.posts.set(posts);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar los puestos');
      },
    });
  }
}
