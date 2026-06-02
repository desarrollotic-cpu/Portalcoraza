import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <section>
      <h2>Dashboard</h2>
      <p>Bienvenido, {{ auth.currentUser()?.fullName ?? 'usuario' }}.</p>
      <p class="role">Rol: {{ auth.currentUser()?.role?.name }}</p>
      <div class="cards">
        <article>
          <h3>Fase 1</h3>
          <p>Auth, roles, permisos, asociados y puestos activos.</p>
        </article>
        <article>
          <h3>Próximos módulos</h3>
          <p>Dotación, programación, documental y unidades residenciales.</p>
        </article>
      </div>
    </section>
  `,
  styles: `
    h2 {
      margin-top: 0;
      color: var(--coraza-blue-900);
      font-weight: 600;
    }
    .role {
      color: var(--coraza-text-muted);
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
      margin-top: 1.5rem;
    }
    article {
      background: var(--coraza-surface);
      border: 1px solid var(--coraza-border);
      border-radius: var(--coraza-radius);
      padding: 1rem 1.25rem;
      box-shadow: var(--coraza-shadow);
    }
    article h3 {
      margin: 0 0 0.5rem;
      font-size: 1rem;
      color: var(--coraza-blue-800);
    }
    article p {
      margin: 0;
      color: var(--coraza-text-muted);
      font-size: 0.9rem;
    }
  `,
})
export class Dashboard {
  readonly auth = inject(AuthService);
}
