import { Component, input } from '@angular/core';

@Component({
  selector: 'app-signature-viewer',
  template: `
    @if (url()) {
      <a [href]="url()!" target="_blank" rel="noopener" class="signature-link" title="Abrir firma completa">
        <img [src]="url()!" [alt]="alt()" class="signature-thumb" />
        <span class="link-label">Ver firma</span>
      </a>
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
  readonly url = input<string | null>(null);
  readonly alt = input('Firma de entrega');
}
