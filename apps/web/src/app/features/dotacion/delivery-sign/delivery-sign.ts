import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { InventoryApiService } from '../inventory-api.service';
import { SignaturePad } from '../signature-pad/signature-pad';

@Component({
  selector: 'app-delivery-sign',
  imports: [SignaturePad],
  template: `
    <section>
      <h2>Firmar entrega</h2>
      <p>Confirma la recepción con firma manuscrita.</p>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <app-signature-pad #signaturePad />

      <div class="actions">
        <button type="button" (click)="cancel()">Cancelar</button>
        <button type="button" (click)="submit()" [disabled]="saving() || (signaturePad?.isEmpty() ?? true)">
          {{ saving() ? 'Guardando...' : 'Confirmar con firma' }}
        </button>
      </div>
    </section>
  `,
  styles: `
    h2 { margin: 0; color: var(--primary-dark); }
    p { color: var(--coraza-text-muted); }
    .actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
    .error { color: var(--coraza-error); }
  `,
})
export class DeliverySign implements OnInit {
  @ViewChild('signaturePad') signaturePad!: SignaturePad;

  private readonly api = inject(InventoryApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  private deliveryId = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Entrega no encontrada');
      return;
    }
    this.deliveryId = id;
  }

  submit(): void {
    const signature = this.signaturePad?.exportDataUrl();
    if (!signature || !this.deliveryId) return;

    this.saving.set(true);
    this.error.set(null);
    this.api.signDelivery(this.deliveryId, signature).subscribe({
      next: () => this.router.navigate(['/dotacion/entregas']),
      error: (err) => {
        this.saving.set(false);
        this.error.set(err.error?.message ?? 'No se pudo confirmar la entrega');
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/dotacion/entregas']);
  }
}
