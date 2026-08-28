import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-minuta-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <header class="top">
        <div>
          <strong>Minuta Virtual</strong>
          <span class="sub">Bitácora del puesto</span>
        </div>
        <button type="button" class="logout" (click)="logout()">Salir</button>
      </header>
      <main class="main">
        <router-outlet />
      </main>
      <nav class="nav">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Inicio</a>
        @if (canCreate()) {
          <a routerLink="/nuevo" routerLinkActive="active">Nuevo</a>
        }
        <a routerLink="/historial" routerLinkActive="active">Historial</a>
      </nav>
    </div>
  `,
  styles: `
    .shell {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      max-width: 720px;
      margin: 0 auto;
    }
    .top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1rem;
      background: var(--primary-800);
      color: #fff;
    }
    .top strong {
      display: block;
      font-size: 1rem;
    }
    .sub {
      font-size: 0.75rem;
      opacity: 0.85;
    }
    .logout {
      border: 0;
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      border-radius: 8px;
      padding: 0.45rem;
      cursor: pointer;
    }
    .main {
      flex: 1;
      padding: 1rem;
      padding-bottom: calc(4.5rem + env(safe-area-inset-bottom, 0px));
    }
    .nav {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      max-width: 720px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.25rem;
      padding: 0.35rem 0.5rem calc(0.35rem + env(safe-area-inset-bottom, 0px));
      background: var(--surface);
      border-top: 1px solid var(--border);
    }
    .nav a {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.65rem;
      border-radius: 10px;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 700;
      text-decoration: none;
    }
    .nav a.active {
      color: var(--primary-800);
      background: #f0f9ff;
    }
  `,
})
export class MinutaShell {
  private readonly auth = inject(AuthService);

  canCreate(): boolean {
    return this.auth.hasPermission('minuta.create');
  }

  logout(): void {
    this.auth.logout();
  }
}
