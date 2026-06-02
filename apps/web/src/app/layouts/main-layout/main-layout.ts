import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">System Coraza</div>
        <nav>
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a routerLink="/rrhh/asociados" routerLinkActive="active">Asociados</a>
        </nav>
        <div class="user">
          <span>{{ auth.currentUser()?.fullName ?? auth.currentUser()?.email }}</span>
          <button type="button" (click)="auth.logout()">Salir</button>
        </div>
      </aside>
      <main class="content">
        <router-outlet />
      </main>
    </div>
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: 240px 1fr;
      min-height: 100vh;
    }
    .sidebar {
      background: var(--coraza-sidebar);
      color: var(--coraza-text-on-dark);
      padding: 1.5rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .brand {
      font-weight: 600;
      font-size: 1.05rem;
      letter-spacing: 0.02em;
      color: #fff;
    }
    nav {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    nav a {
      color: rgba(232, 244, 252, 0.75);
      text-decoration: none;
      padding: 0.55rem 0.75rem;
      border-radius: var(--coraza-radius);
      font-size: 0.9rem;
      transition: background 0.15s ease, color 0.15s ease;
    }
    nav a.active,
    nav a:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    nav a.active {
      background: var(--coraza-primary);
    }
    .user {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: var(--coraza-text-muted);
      filter: brightness(1.4);
    }
    .user span {
      color: var(--coraza-text-on-dark);
    }
    .user button {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: var(--coraza-text-on-dark);
      padding: 0.4rem 0.6rem;
      border-radius: var(--coraza-radius);
      cursor: pointer;
      font-size: 0.85rem;
      transition: background 0.15s ease;
    }
    .user button:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .content {
      padding: 1.5rem 2rem;
      background: var(--coraza-bg);
    }
  `,
})
export class MainLayout {
  readonly auth = inject(AuthService);
}
