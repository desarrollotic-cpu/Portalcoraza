import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { InventoryApiService } from '../inventory-api.service';

@Component({
  selector: 'app-signature-viewer',
  template: `
    @if (!deliveryId()) {
      <span class="muted">Sin firma</span>
    } @else if (!active()) {
      <span class="muted">—</span>
    } @else if (blobUrl()) {
      <div class="signature-box">
        <img [src]="blobUrl()!" [alt]="alt()" class="signature-img" />
        <a [href]="blobUrl()!" target="_blank" rel="noopener" class="open-link">Abrir en pestaña</a>
      </div>
    } @else if (loading()) {
      <span class="muted">Cargando firma…</span>
    } @else if (error()) {
      <span class="muted">{{ error() }}</span>
    } @else {
      <span class="muted">Sin firma</span>
    }
  `,
  styles: `
    .signature-box {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .signature-img {
      width: min(100%, 420px);
      max-height: 220px;
      object-fit: contain;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      background: #fff;
      padding: 8px;
    }
    .open-link {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--primary-dark);
    }
    .muted {
      color: var(--coraza-text-muted);
      font-size: 0.85rem;
    }
  `,
})
export class SignatureViewer {
  private readonly api = inject(InventoryApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly deliveryId = input<string | null>(null);
  /** Solo carga la imagen cuando es true (p. ej. al abrir el modal). */
  readonly active = input(true);
  readonly alt = input('Firma de entrega');

  readonly blobUrl = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const id = this.deliveryId();
      const active = this.active();
      this.revokeCurrent();
      this.blobUrl.set(null);
      this.error.set(null);

      if (!id || !active) {
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      const sub = this.api.getDeliverySignatureBlob(id).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          this.blobUrl.set(url);
          this.loading.set(false);
        },
        error: (err) => {
          const msg =
            err?.status === 404
              ? 'Firma no encontrada'
              : err?.status === 403
                ? 'Sin permiso para ver la firma'
                : 'No se pudo cargar la firma';
          this.error.set(msg);
          this.loading.set(false);
        },
      });
      onCleanup(() => sub.unsubscribe());
    });

    this.destroyRef.onDestroy(() => this.revokeCurrent());
  }

  private revokeCurrent(): void {
    const current = this.blobUrl();
    if (current) {
      URL.revokeObjectURL(current);
    }
  }
}
