import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { Delivery, DeliveryDetail, InventoryApiService } from '../inventory-api.service';
import { ModalShell } from '../modal-shell/modal-shell';
import { RevertDeliveryDialog } from '../revert-delivery-dialog/revert-delivery-dialog';
import { SignatureViewer } from '../signature-viewer/signature-viewer';

const REVERT_WINDOW_MS = 120 * 60 * 60 * 1000;

@Component({
  selector: 'app-delivery-history',
  imports: [DatePipe, ModalShell, RevertDeliveryDialog, SignatureViewer],
  template: `
    <section class="history">
      <h3>{{ title() }}</h3>
      @if (loading()) {
        <p>Cargando entregas...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Elementos entregados</th>
              <th>Firma</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (d of deliveries(); track d.id) {
              <tr [class.reverted]="d.status === 'REVERTED'">
                <td>{{ (d.deliveredAt ?? d.createdAt) | date: 'short' }}</td>
                <td>
                  <span
                    class="badge"
                    [class.delivered]="d.status === 'DELIVERED'"
                    [class.reverted]="d.status === 'REVERTED'"
                    [class.pending]="d.status === 'PENDING'"
                  >
                    {{ statusLabel(d.status) }}
                  </span>
                  @if (d.status === 'REVERTED' && d.revertReason) {
                    <small class="revert-note">{{ d.revertReason }}</small>
                  }
                </td>
                <td>
                  <ul class="items">
                    @for (line of d.details; track line.id) {
                      <li>{{ detailLabel(line) }}</li>
                    } @empty {
                      <li class="muted">Sin elementos</li>
                    }
                  </ul>
                  @if (d.observations) {
                    <small class="obs">Obs: {{ d.observations }}</small>
                  }
                </td>
                <td>
                  @if (d.signatureUrl) {
                    <button
                      type="button"
                      class="btn-eye"
                      title="Ver firma"
                      aria-label="Ver firma"
                      (click)="openSignature(d)"
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                        <path
                          fill="currentColor"
                          d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
                        />
                      </svg>
                    </button>
                  } @else {
                    <span class="muted">Sin firma</span>
                  }
                </td>
                <td>
                  @if (canRevert(d)) {
                    <button type="button" class="btn-revert" (click)="openRevert(d)">Revertir</button>
                  } @else if (d.status === 'PENDING') {
                    <span class="muted">Pendiente de firma</span>
                  } @else {
                    <span class="muted">—</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="5">Sin entregas registradas.</td></tr>
            }
          </tbody>
        </table>
      }
    </section>

    <app-modal-shell
      [open]="!!signatureDeliveryId()"
      title="Firma de la entrega"
      (closed)="closeSignature()"
    >
      @if (signatureDeliveryId(); as sid) {
        <app-signature-viewer [deliveryId]="sid" [active]="true" />
      }
    </app-modal-shell>

    <app-revert-delivery-dialog
      [open]="revertOpen()"
      [saving]="reverting()"
      [error]="revertError()"
      (confirmed)="onRevertConfirm($event)"
      (cancelled)="closeRevert()"
    />
  `,
  styles: `
    h3 { margin: 1.5rem 0 0.75rem; color: var(--primary-dark); }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--coraza-surface);
      border: 1px solid var(--coraza-border);
      border-radius: var(--coraza-radius);
    }
    th, td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--coraza-border); text-align: left; vertical-align: top; }
    th { font-size: 0.75rem; text-transform: uppercase; background: var(--primary-50); }
    tr.reverted { opacity: 0.75; }
    .badge {
      font-size: 0.75rem;
      font-weight: 600;
      background: #fff3cd;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
    }
    .badge.delivered { background: #d4edda; color: #166534; }
    .badge.reverted { background: #f8d7da; color: #991b1b; }
    .badge.pending { background: #e2e8f0; color: #334155; }
    .items {
      margin: 0;
      padding-left: 1.1rem;
      font-size: 0.9rem;
      line-height: 1.45;
    }
    .obs { display: block; margin-top: 0.35rem; color: var(--coraza-text-muted); }
    .revert-note { display: block; margin-top: 0.25rem; color: var(--coraza-text-muted); }
    .error { color: var(--coraza-error); }
    .muted { color: var(--coraza-text-muted); font-size: 0.85rem; }
    .btn-eye {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      background: #fff;
      color: var(--primary-dark, #1d4ed8);
      cursor: pointer;
    }
    .btn-eye:hover { background: #eff6ff; }
    .btn-revert {
      padding: 0.35rem 0.7rem;
      border: 1px solid #fecaca;
      border-radius: 8px;
      background: #fef2f2;
      color: #b91c1c;
      font-weight: 600;
      font-size: 0.8rem;
      cursor: pointer;
    }
  `,
})
export class DeliveryHistory {
  readonly associateId = input<string | null>(null);
  readonly postId = input<string | null>(null);
  readonly title = input('Historial de entregas');
  readonly changed = output<void>();

  private readonly api = inject(InventoryApiService);
  readonly auth = inject(AuthService);

  readonly deliveries = signal<Delivery[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly revertOpen = signal(false);
  readonly reverting = signal(false);
  readonly revertError = signal<string | null>(null);
  readonly signatureDeliveryId = signal<string | null>(null);
  private revertTarget: Delivery | null = null;

  constructor() {
    effect(() => {
      const associateId = this.associateId();
      const postId = this.postId();
      if (associateId || postId) {
        this.load();
      }
    });
  }

  statusLabel(status: string): string {
    if (status === 'DELIVERED') return 'Entregada';
    if (status === 'REVERTED') return 'Revertida';
    if (status === 'PENDING') return 'Pendiente';
    return status;
  }

  detailLabel(line: DeliveryDetail): string {
    const item = line.variant?.item?.name ?? line.variant?.sku ?? 'Elemento';
    const talla = String(line.variant?.talla ?? line.variant?.attributes?.['talla'] ?? '').trim();
    const generoRaw = line.variant?.genero
      ?? (line.variant?.attributes?.['genero'] != null ? String(line.variant.attributes['genero']) : '');
    const genero =
      generoRaw === 'M' || generoRaw === 'Hombre'
        ? 'Hombre'
        : generoRaw === 'F' || generoRaw === 'Mujer'
          ? 'Mujer'
          : '';
    const bits = [item, talla ? `talla ${talla}` : null, genero || null].filter(Boolean);
    return `${bits.join(' · ')} × ${line.quantity}`;
  }

  openSignature(delivery: Delivery): void {
    this.signatureDeliveryId.set(delivery.id);
  }

  closeSignature(): void {
    this.signatureDeliveryId.set(null);
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listDeliveries({
        associateId: this.associateId() ?? undefined,
        postId: this.postId() ?? undefined,
      })
      .subscribe({
        next: (items) => {
          this.deliveries.set(items);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('No se pudo cargar el historial de entregas');
        },
      });
  }

  canRevert(delivery: Delivery): boolean {
    if (!this.auth.hasPermission('deliveries.revert')) return false;
    if (delivery.status !== 'DELIVERED' || !delivery.deliveredAt) return false;
    const elapsed = Date.now() - new Date(delivery.deliveredAt).getTime();
    return elapsed <= REVERT_WINDOW_MS;
  }

  openRevert(delivery: Delivery): void {
    this.revertTarget = delivery;
    this.revertError.set(null);
    this.revertOpen.set(true);
  }

  closeRevert(): void {
    this.revertOpen.set(false);
    this.revertTarget = null;
    this.revertError.set(null);
  }

  onRevertConfirm(reason: string): void {
    if (!this.revertTarget) return;
    this.reverting.set(true);
    this.revertError.set(null);
    this.api.revertDelivery(this.revertTarget.id, reason).subscribe({
      next: () => {
        this.reverting.set(false);
        this.closeRevert();
        this.load();
        this.changed.emit();
      },
      error: (err) => {
        this.reverting.set(false);
        this.revertError.set(err?.error?.message ?? 'No se pudo revertir la entrega');
      },
    });
  }
}
