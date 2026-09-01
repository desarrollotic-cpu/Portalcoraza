import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DeliveryDialog } from '../delivery-dialog/delivery-dialog';
import { DeliverableAssociate, Delivery, InventoryApiService } from '../inventory-api.service';
import { ModalShell } from '../modal-shell/modal-shell';
import { SignatureViewer } from '../signature-viewer/signature-viewer';

@Component({
  selector: 'app-deliveries-list',
  imports: [RouterLink, DatePipe, DeliveryDialog, ModalShell, SignatureViewer],
  template: `
    <div class="dot-page">
      <header class="dot-dash-panel__head">
        <div>
          <h2 style="margin:0;font-size:1.1rem">Entregas</h2>
          <p class="dot-muted" style="margin:0.35rem 0 0">Registro global de entregas de dotación.</p>
        </div>
        @if (auth.hasPermission('deliveries.create')) {
          <button type="button" class="hr-btn hr-btn-primary" (click)="openNewDelivery()">Nueva entrega</button>
        }
      </header>

      <div class="dot-filter-bar">
        <label>
          Buscar asociado
          <input
            type="search"
            placeholder="Nombre o cédula..."
            [value]="search()"
            (input)="onSearchInput($event)"
          />
        </label>
        <span class="dot-muted">{{ total() }} entrega(s)</span>
      </div>

      @if (loading()) {
        <div class="dot-skeleton" style="height:240px"></div>
      } @else if (error()) {
        <div class="dot-error">{{ error() }}</div>
      } @else {
        <div class="dot-dash-panel" style="padding:0">
          <div class="dot-table-wrap">
            <table class="dot-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Asociado</th>
                  <th>Estado</th>
                  <th>Elementos</th>
                  <th>Firma</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (d of deliveries(); track d.id) {
                  <tr>
                    <td>{{ (d.deliveredAt ?? d.createdAt) | date: 'short' }}</td>
                    <td>{{ associateName(d) }}</td>
                    <td>
                      <span class="dot-badge" [class]="statusClass(d.status)">{{ statusLabel(d.status) }}</span>
                    </td>
                    <td>
                      <ul class="items-list">
                        @for (line of d.details; track line.id) {
                          <li>{{ detailLabel(line) }}</li>
                        } @empty {
                          <li class="dot-muted">Sin líneas</li>
                        }
                      </ul>
                    </td>
                    <td>
                      @if (d.signatureUrl) {
                        <button type="button" class="btn-eye" title="Ver firma" aria-label="Ver firma" (click)="openSignature(d)">
                          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                            <path
                              fill="currentColor"
                              d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
                            />
                          </svg>
                        </button>
                      } @else {
                        <span class="dot-muted">—</span>
                      }
                    </td>
                    <td>
                      @if (d.status === 'PENDING') {
                        <a [routerLink]="['/dotacion/entregas', d.id, 'firmar']">Firmar</a>
                      } @else {
                        —
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="dot-empty">No hay entregas registradas.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="dot-pagination">
          <button type="button" class="hr-btn hr-btn-ghost btn-sm" [disabled]="page() <= 1" (click)="goPage(page() - 1)">
            Anterior
          </button>
          <span class="dot-muted">Página {{ page() }} de {{ totalPages() }}</span>
          <button
            type="button"
            class="hr-btn hr-btn-ghost btn-sm"
            [disabled]="page() >= totalPages()"
            (click)="goPage(page() + 1)"
          >
            Siguiente
          </button>
        </div>
      }
    </div>

    <app-modal-shell
      [open]="!!signatureDeliveryId()"
      title="Firma de la entrega"
      (closed)="closeSignature()"
    >
      @if (signatureDeliveryId(); as sid) {
        <app-signature-viewer [deliveryId]="sid" [active]="true" />
      }
    </app-modal-shell>

    <app-delivery-dialog
      [open]="dialogOpen()"
      [associateId]="dialogAssociateId()"
      [subjectLabel]="dialogSubject()"
      (completed)="onDeliveryCompleted()"
      (dismissed)="closeDialog()"
    />
  `,
  styles: `
    .items-list {
      margin: 0;
      padding-left: 1rem;
      font-size: 0.82rem;
    }
    .items-list li { margin-bottom: 0.15rem; }
    .btn-eye {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--coraza-border, #e5e5e5);
      border-radius: 8px;
      background: #fff;
      color: var(--primary-dark, #1d4ed8);
      cursor: pointer;
    }
    .btn-eye:hover { background: #eff6ff; }
    .dot-pagination {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-top: 1rem;
    }
    .btn-sm { padding: 0.35rem 0.65rem; font-size: 0.78rem; }
    .dot-filter-bar input[type='search'] { min-width: 220px; }
  `,
})
export class DeliveriesList implements OnInit {
  private readonly api = inject(InventoryApiService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly deliveries = signal<Delivery[]>([]);
  readonly deliverable = signal<DeliverableAssociate[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly page = signal(1);
  readonly limit = signal(25);
  readonly total = signal(0);
  readonly totalPages = signal(1);
  readonly search = signal('');

  readonly dialogOpen = signal(false);
  readonly dialogAssociateId = signal<string | null>(null);
  readonly dialogSubject = signal('');
  readonly signatureDeliveryId = signal<string | null>(null);

  ngOnInit(): void {
    this.api.listEligibleAssociates().subscribe({
      next: (deliverable) => this.deliverable.set(deliverable),
    });
    this.load();
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.search.set(value);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.page.set(1);
      this.load();
    }, 350);
  }

  goPage(next: number): void {
    if (next < 1 || next > this.totalPages()) return;
    this.page.set(next);
    this.load();
  }

  associateName(d: Delivery): string {
    if (!d.associateId) return 'Puesto';
    const embedded = d.associate;
    if (embedded) {
      const name = [
        embedded.firstName,
        embedded.secondName,
        embedded.firstLastName,
        embedded.secondLastName,
      ]
        .filter(Boolean)
        .join(' ');
      return name || embedded.documentNumber || '—';
    }
    const a = this.deliverable().find((x) => x.id === d.associateId);
    if (!a) return d.associateId.slice(0, 8);
    const name = [a.firstName, a.secondName, a.firstLastName, a.secondLastName]
      .filter(Boolean)
      .join(' ');
    return name || a.documentNumber || '—';
  }

  detailLabel(line: Delivery['details'][number]): string {
    const item = line.variant?.item?.name ?? line.variant?.sku ?? 'Ítem';
    const talla = String(line.variant?.talla ?? line.variant?.attributes?.['talla'] ?? '').trim();
    const generoRaw =
      line.variant?.genero ??
      (line.variant?.attributes?.['genero'] != null ? String(line.variant.attributes['genero']) : '');
    const genero =
      generoRaw === 'M' || generoRaw === 'Hombre'
        ? 'Hombre'
        : generoRaw === 'F' || generoRaw === 'Mujer'
          ? 'Mujer'
          : '';
    const bits = [item, talla ? `talla ${talla}` : null, genero || null].filter(Boolean);
    return `${bits.join(' · ')} × ${line.quantity}`;
  }

  statusClass(status: string): string {
    if (status === 'DELIVERED') return 'dot-badge dot-badge--delivered';
    if (status === 'REVERTED') return 'dot-badge dot-badge--reverted';
    return 'dot-badge dot-badge--pending';
  }

  statusLabel(status: string): string {
    if (status === 'DELIVERED') return 'Entregada';
    if (status === 'REVERTED') return 'Revertida';
    if (status === 'PENDING') return 'Pendiente';
    return status;
  }

  openSignature(d: Delivery): void {
    this.signatureDeliveryId.set(d.id);
  }

  closeSignature(): void {
    this.signatureDeliveryId.set(null);
  }

  openNewDelivery(): void {
    const eligible = this.deliverable();
    if (eligible.length === 1) {
      const a = eligible[0];
      this.dialogAssociateId.set(a.id);
      this.dialogSubject.set(this.formatName(a));
      this.dialogOpen.set(true);
      return;
    }
    void this.router.navigate(['/dotacion/asociados']);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  onDeliveryCompleted(): void {
    this.closeDialog();
    this.load();
  }

  private formatName(a: DeliverableAssociate): string {
    const name = [a.firstName, a.secondName, a.firstLastName, a.secondLastName]
      .filter(Boolean)
      .join(' ');
    return name || a.documentNumber || '—';
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listDeliveriesPaginated({
        page: this.page(),
        limit: this.limit(),
        search: this.search().trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.deliveries.set(res.items);
          this.total.set(res.total);
          this.totalPages.set(res.totalPages);
          this.page.set(res.page);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('No se pudieron cargar las entregas');
        },
      });
  }
}
