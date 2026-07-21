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
    @if (blobUrl()) {
      <a [href]="blobUrl()!" target="_blank" rel="noopener" class="signature-link" title="Abrir firma completa">
        <img [src]="blobUrl()!" [alt]="alt()" class="signature-thumb" />
        <span class="link-label">Ver firma</span>
      </a>
    } @else if (loading()) {
      <span class="muted">Cargando firma…</span>
    } @else if (error()) {
      <span class="muted">{{ error() }}</span>
    } @else {
      <span class="muted">Sin firma</span>
    }
  `,
  styles: `
    .signature-link {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.3rem;
      color: var(--primary-dark);
      text-decoration: none;
      font-size: 0.8rem;
      font-weight: 600;
    }
    .signature-link:hover .link-label {
      text-decoration: underline;
    }
    .signature-thumb {
      width: 140px;
      height: 72px;
      object-fit: contain;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      background: #fff;
      padding: 4px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
    }
    .link-label {
      color: var(--primary-600, var(--primary-dark));
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
  readonly alt = input('Firma de entrega');

  readonly blobUrl = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    effect((onCleanup) => {
      const id = this.deliveryId();
      this.revokeCurrent();
      this.blobUrl.set(null);
      this.error.set(null);

      if (!id) {
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
        error: () => {
          this.error.set('No se pudo cargar la firma');
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
