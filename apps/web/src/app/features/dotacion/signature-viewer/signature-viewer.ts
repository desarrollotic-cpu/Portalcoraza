import { Component, input } from '@angular/core';

@Component({
  selector: 'app-signature-viewer',
  template: `
    @if (url()) {
      <a [href]="url()!" target="_blank" rel="noopener" class="signature-link">
        <img [src]="url()!" [alt]="alt()" class="signature-thumb" />
        <span>Ver firma</span>
      </a>
    } @else {
      <span class="muted">—</span>
    }
  `,
  styles: `
    .signature-link {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
      color: var(--primary-dark);
      text-decoration: none;
      font-size: 0.85rem;
    }
    .signature-thumb {
      width: 96px;
      height: 40px;
      object-fit: contain;
      border: 1px solid var(--coraza-border);
      border-radius: 4px;
      background: #fff;
    }
    .muted { color: var(--coraza-text-muted); }
  `,
})
export class SignatureViewer {
  readonly url = input<string | null>(null);
  readonly alt = input('Firma de entrega');
}
