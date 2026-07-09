import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { Delivery, InventoryApiService } from '../inventory-api.service';
import { RevertDeliveryDialog } from '../revert-delivery-dialog/revert-delivery-dialog';
import { SignatureViewer } from '../signature-viewer/signature-viewer';

const REVERT_WINDOW_MS = 120 * 60 * 60 * 1000;

@Component({
  selector: 'app-delivery-history',
  imports: [DatePipe, RevertDeliveryDialog, SignatureViewer],
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
              <th>Ítems</th>
              <th>Firma</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            @for (d of deliveries(); track d.id) {
              <tr [class.reverted]="d.status === 'REVERTED'">
                <td>{{ (d.deliveredAt ?? d.createdAt) | date: 'short' }}</td>
                <td>
                  <span class="badge" [class.delivered]="d.status === 'DELIVERED'" [class.reverted]="d.status === 'REVERTED'">
                    {{ d.status }}
                  </span>
                  @if (d.status === 'REVERTED' && d.revertReason) {
                    <small class="revert-note">{{ d.revertReason }}</small>
                  }
                </td>
                <td>{{ d.details.length }} línea(s)</td>
                <td>
                  <app-signature-viewer [url]="d.signatureUrl" />
                </td>
                <td>
                  @if (canRevert(d)) {
                    <button type="button" (click)="openRevert(d)">Revertir</button>
                  } @else if (d.status === 'PENDING') {
                    <span class="muted">Pendiente de firma</span>
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
    th, td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--coraza-border); text-align: left; }
    th { font-size: 0.75rem; text-transform: uppercase; background: var(--primary-50); }
    tr.reverted { opacity: 0.75; }
    .badge {
      font-size: 0.75rem;
      background: #fff3cd;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
    }
    .badge.delivered { background: #d4edda; }
    .badge.reverted { background: #f8d7da; }
    .revert-note { display: block; margin-top: 0.25rem; color: var(--coraza-text-muted); }
    .error { color: var(--coraza-error); }
    .muted { color: var(--coraza-text-muted); font-size: 0.85rem; }
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
