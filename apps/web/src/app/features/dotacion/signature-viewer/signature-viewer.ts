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

  /** No usar signal aquí: leer blobUrl() dentro del effect re-dispara el effect. */
  private objectUrl: string | null = null;

  constructor() {
    effect((onCleanup) => {
      const id = this.deliveryId();
      const active = this.active();

      this.revokeObjectUrl();
      this.blobUrl.set(null);
      this.error.set(null);

      if (!id || !active) {
        this.loading.set(false);
        return;
      }

      this.loading.set(true);
      const sub = this.api.getDeliverySignatureBlob(id).subscribe({
        next: async (blob) => {
          // Si el API devolvió JSON de error con status 200 mal tipado, o blob vacío.
          if (!blob || blob.size === 0) {
            this.error.set('Firma vacía o no disponible');
            this.loading.set(false);
            return;
          }
          if (blob.type && blob.type.includes('json')) {
            this.error.set(await this.readBlobError(blob));
            this.loading.set(false);
            return;
          }
          const url = URL.createObjectURL(blob);
          this.objectUrl = url;
          this.blobUrl.set(url);
          this.loading.set(false);
        },
        error: async (err) => {
          this.error.set(await this.formatHttpError(err));
          this.loading.set(false);
        },
      });
      onCleanup(() => sub.unsubscribe());
    });

    this.destroyRef.onDestroy(() => this.revokeObjectUrl());
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
  }

  private async formatHttpError(err: unknown): Promise<string> {
    const e = err as { status?: number; error?: Blob | { message?: string }; message?: string };
    if (e?.status === 404) return 'Firma no encontrada';
    if (e?.status === 403) return 'Sin permiso para ver la firma';
    if (e?.error instanceof Blob) {
      return this.readBlobError(e.error);
    }
    if (e?.error && typeof e.error === 'object' && 'message' in e.error) {
      return String((e.error as { message?: string }).message ?? 'No se pudo cargar la firma');
    }
    return e?.message ?? 'No se pudo cargar la firma';
  }

  private async readBlobError(blob: Blob): Promise<string> {
    try {
      const text = await blob.text();
      const parsed = JSON.parse(text) as { message?: string };
      return parsed.message ?? 'No se pudo cargar la firma';
    } catch {
      return 'No se pudo cargar la firma';
    }
  }
}
