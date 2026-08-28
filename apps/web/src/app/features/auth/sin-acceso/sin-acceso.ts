import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-sin-acceso',
  imports: [RouterLink],
  template: `
    <section class="denied">
      <h1>Sin acceso</h1>
      <p>
        Tu cuenta está activa, pero no tiene permisos para abrir esta sección del portal.
        Contacta al administrador para revisar tu rol.
      </p>
      <div class="actions">
        <button type="button" class="btn" (click)="logout()">Cerrar sesión</button>
        <a routerLink="/auth/login" class="link">Volver al login</a>
      </div>
    </section>
  `,
  styles: `
    .denied {
      max-width: 480px;
      margin: 4rem auto;
      padding: 2rem;
      text-align: center;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow);
    }
    h1 {
      margin: 0 0 0.75rem;
      font-family: var(--font-display);
      color: var(--primary-dark);
    }
    p {
      margin: 0 0 1.5rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      align-items: center;
    }
    .btn {
      padding: 0.55rem 1.25rem;
      border-radius: 8px;
      border: none;
      background: var(--primary);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
    .link {
      color: var(--primary-600);
      font-size: 0.9rem;
    }
  `,
})
export class SinAcceso {
  private readonly auth = inject(AuthService);

  logout(): void {
    this.auth.logout();
  }
}
