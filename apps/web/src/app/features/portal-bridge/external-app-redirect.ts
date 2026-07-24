import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LucideExternalLink, LucideLoaderCircle } from '@lucide/angular';
import { Icon } from '../../shared/components/icon/icon';

/**
 * Puente del portal hacia apps oficiales externas.
 * Fase 1: redirige tras login/permiso. Fase 2 (SSO): pasará token.
 */
@Component({
  selector: 'app-external-app-redirect',
  imports: [Icon],
  template: `
    <section class="bridge">
      <div class="card">
        <div class="spinner">
          <app-icon [icon]="icons.Loader" [size]="28" [strokeWidth]="2" />
        </div>
        <h1>Abriendo {{ label }}</h1>
        <p>
          Portal Coraza es la puerta de entrada. Te estamos llevando al módulo oficial.
        </p>
        <a class="link" [href]="url" rel="noopener noreferrer">
          <app-icon [icon]="icons.External" [size]="16" [strokeWidth]="2" />
          Si no redirige, haz clic aquí
        </a>
      </div>
    </section>
  `,
  styles: `
    .bridge {
      min-height: 60vh;
      display: grid;
      place-items: center;
      padding: 2rem;
    }
    .card {
      max-width: 420px;
      text-align: center;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 2rem 1.75rem;
      box-shadow: var(--shadow);
    }
    .spinner {
      display: inline-flex;
      color: var(--primary-600);
      margin-bottom: 1rem;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    h1 {
      margin: 0 0 0.5rem;
      font-family: var(--font-display);
      font-size: 1.25rem;
      color: var(--text-primary);
    }
    p {
      margin: 0 0 1.25rem;
      color: var(--text-secondary);
      font-size: 0.92rem;
      line-height: 1.45;
    }
    .link {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      color: var(--primary-600);
      font-weight: 600;
      font-size: 0.9rem;
    }
  `,
})
export class ExternalAppRedirect implements OnInit {
  private readonly route = inject(ActivatedRoute);

  readonly icons = {
    Loader: LucideLoaderCircle,
    External: LucideExternalLink,
  };

  label = 'el módulo';
  url = '';

  ngOnInit(): void {
    const data = this.route.snapshot.data;
    this.label = (data['externalLabel'] as string) || this.label;
    this.url = (data['externalUrl'] as string) || '';
    if (this.url) {
      // Misma pestaña: el portal entrega al espacio de trabajo oficial.
      window.location.assign(this.url);
    }
  }
}
