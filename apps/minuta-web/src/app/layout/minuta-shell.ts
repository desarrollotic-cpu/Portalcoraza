import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-minuta-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell">
      <header class="top">
        <div class="top-inner">
          <div class="brand">
            @if (showBack()) {
              <button type="button" class="back" (click)="goBack()">Atrás</button>
            }
            <div>
              <strong>Minuta Virtual</strong>
              <span class="sub">{{ userLabel() }}</span>
            </div>
          </div>
          <button type="button" class="logout" (click)="logout()">Salir</button>
        </div>
      </header>
      <main class="main">
        <router-outlet />
      </main>
      <nav class="nav">
        <div class="nav-inner" [class.two]="!canCreate()">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Inicio</a>
          @if (canCreate()) {
            <a routerLink="/nuevo" routerLinkActive="active">Registrar</a>
          }
          <a routerLink="/historial" routerLinkActive="active">Historial</a>
        </div>
      </nav>
    </div>
  `,
  styles: `
    .shell {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
    }
    .top {
      background: var(--primary-800);
      color: #fff;
    }
    .top-inner {
      width: min(100%, 1100px);
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.9rem 1.25rem;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }
    .top strong {
      display: block;
      font-size: 1.15rem;
    }
    .sub {
      display: block;
      font-size: 0.9rem;
      opacity: 0.9;
      max-width: 14rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .back,
    .logout {
      min-height: 3rem;
      min-width: 4.75rem;
      border: 1px solid rgba(255, 255, 255, 0.28);
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      border-radius: 12px;
      padding: 0.5rem 0.95rem;
      font: inherit;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
    }
    .main {
      flex: 1;
      width: min(100%, 1100px);
      margin: 0 auto;
      padding: 1.25rem 1.25rem calc(5.75rem + env(safe-area-inset-bottom, 0px));
    }
    .nav {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--surface);
      border-top: 1px solid var(--border);
      box-shadow: 0 -4px 16px rgba(15, 23, 42, 0.06);
    }
    .nav-inner {
      width: min(100%, 1100px);
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.4rem;
      padding: 0.5rem 0.75rem calc(0.5rem + env(safe-area-inset-bottom, 0px));
    }
    .nav-inner.two {
      grid-template-columns: repeat(2, 1fr);
    }
    .nav a {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 3.15rem;
      border-radius: 12px;
      color: var(--text-muted);
      font-size: 1.05rem;
      font-weight: 800;
      text-decoration: none;
    }
    .nav a.active {
      color: var(--primary-800);
      background: #f0f9ff;
    }
    @media (min-width: 900px) {
      .top-inner,
      .main,
      .nav-inner {
        width: min(100%, 1200px);
        padding-left: 2rem;
        padding-right: 2rem;
      }
      .top strong {
        font-size: 1.35rem;
      }
    }
  `,
})
export class MinutaShell {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly showBack = signal(false);

  constructor() {
    this.syncBack(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.syncBack(e.urlAfterRedirects));
  }

  canCreate(): boolean {
    return this.auth.hasPermission('minuta.create');
  }

  userLabel(): string {
    const u = this.auth.currentUser();
    const name = (u?.fullName || u?.email || '').trim();
    return name ? `Puesto · ${name}` : 'Bitácora del puesto';
  }

  goBack(): void {
    void this.router.navigateByUrl('/');
  }

  logout(): void {
    this.auth.logout();
  }

  private syncBack(url: string): void {
    const path = url.split('?')[0].replace(/^\//, '');
    this.showBack.set(path !== '' && path !== '/');
  }
}
