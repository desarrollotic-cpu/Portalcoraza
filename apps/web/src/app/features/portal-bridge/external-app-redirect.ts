import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LucideExternalLink, LucideArrowLeft } from '@lucide/angular';
import { Icon } from '../../shared/components/icon/icon';

/**
 * Puente del portal hacia apps oficiales externas.
 * Abre en pestaña nueva (mejor para Google Apps Script y para no perder el portal).
 * Fase 2 (SSO): pasará token.
 */
@Component({
  selector: 'app-external-app-redirect',
  imports: [Icon, RouterLink],
  template: `
    <section class="bridge">
      <div class="card">
        <h1>{{ label }}</h1>
        <p>
          Este módulo vive en su aplicación oficial. Se abre en una
          <strong>pestaña nueva</strong> para que el Portal Coraza siga siendo tu puerta de entrada.
        </p>
        @if (hint()) {
          <p class="hint">{{ hint() }}</p>
        }
        <div class="actions">
          <a
            class="btn primary"
            [href]="url"
            target="_blank"
            rel="noopener noreferrer"
            (click)="opened.set(true)"
          >
            <app-icon [icon]="icons.External" [size]="16" [strokeWidth]="2" />
            Abrir {{ label }}
          </a>
          <a routerLink="/dashboard" class="btn ghost">
            <app-icon [icon]="icons.Back" [size]="16" [strokeWidth]="2" />
            Volver al dashboard
          </a>
        </div>
        @if (opened()) {
          <p class="ok">Si no ves la ventana nueva, revisa el bloqueador de ventanas emergentes.</p>
        }
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
      max-width: 460px;
      text-align: center;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 2rem 1.75rem;
      box-shadow: var(--shadow);
    }
    h1 {
      margin: 0 0 0.5rem;
      font-family: var(--font-display);
      font-size: 1.25rem;
      color: var(--text-primary);
    }
    p {
      margin: 0 0 1rem;
      color: var(--text-secondary);
      font-size: 0.92rem;
      line-height: 1.45;
    }
    .hint {
      background: var(--warning-bg, #fff7ed);
      color: var(--warning-dark, #9a3412);
      border-radius: var(--radius-sm);
      padding: 0.65rem 0.75rem;
      font-size: 0.85rem;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      justify-content: center;
      margin-top: 0.5rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.65rem 1rem;
      border-radius: var(--radius-sm);
      font-weight: 600;
      font-size: 0.9rem;
      text-decoration: none;
    }
    .btn.primary {
      background: var(--gradient-primary, var(--primary-600));
      color: #fff;
    }
    .btn.ghost {
      border: 1px solid var(--border);
      color: var(--text-primary);
      background: transparent;
    }
    .ok {
      margin-top: 1rem;
      font-size: 0.82rem;
      color: var(--text-secondary);
    }
  `,
})
export class ExternalAppRedirect implements OnInit {
  private readonly route = inject(ActivatedRoute);

  readonly icons = {
    External: LucideExternalLink,
    Back: LucideArrowLeft,
  };

  readonly opened = signal(false);
  readonly hint = signal<string | null>(null);

  label = 'el módulo';
  url = '';

  ngOnInit(): void {
    const data = this.route.snapshot.data;
    this.label = (data['externalLabel'] as string) || this.label;
    this.url = (data['externalUrl'] as string) || '';

    if ((data['externalHint'] as string) || this.label.toLowerCase().includes('documental')) {
      this.hint.set(
        (data['externalHint'] as string) ||
          'Gestión Documental usa Google Apps Script: puede pedir inicio de sesión de Google la primera vez y tardar unos segundos en cargar.',
      );
    }

    if (this.url) {
      // Intento abrir en pestaña nueva; el usuario se queda en el puente del portal.
      const win = window.open(this.url, '_blank', 'noopener,noreferrer');
      if (win) {
        this.opened.set(true);
      }
    }
  }
}
