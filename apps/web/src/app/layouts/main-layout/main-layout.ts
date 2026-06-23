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
          @if (auth.hasPermission('inventory.view')) {
            <a routerLink="/dotacion" routerLinkActive="active">Dotación</a>
          }
          @if (auth.hasPermission('scheduling.view')) {
            <a routerLink="/programacion" routerLinkActive="active">Programación</a>
          }
          @if (auth.hasPermission('documental.view')) {
            <a routerLink="/documental" routerLinkActive="active">Documental</a>
          }
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
      background: var(--gradient-indigo-soft);
      color: var(--text-on-primary);
      padding: 1.5rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .brand {
      font-weight: 600;
      font-size: 1.05rem;
      letter-spacing: 0.02em;
      color: var(--text-on-primary);
    }
    nav {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    nav a {
      color: rgba(255, 255, 255, 0.82);
      text-decoration: none;
      padding: 0.55rem 0.75rem;
      border-radius: var(--coraza-radius);
      font-size: 0.9rem;
      transition: background 0.15s ease, color 0.15s ease;
    }
    nav a:hover {
      background: rgba(255, 255, 255, 0.12);
      color: var(--text-on-primary);
    }
    nav a.active {
      background: var(--primary-dark);
      color: var(--text-on-primary);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }
    .user {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.8rem;
    }
    .user span {
      color: var(--primary-50);
      opacity: 0.95;
    }
    .user button {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.35);
      color: var(--text-on-primary);
      padding: 0.4rem 0.6rem;
      border-radius: var(--coraza-radius);
      cursor: pointer;
      font-size: 0.85rem;
      transition: background 0.15s ease;
    }
    .user button:hover {
      background: rgba(255, 255, 255, 0.1);
    }
    .content {
      padding: 1.5rem 2rem;
      background: var(--bg-page);
    }
  `,
})
export class MainLayout {
  readonly auth = inject(AuthService);
}
