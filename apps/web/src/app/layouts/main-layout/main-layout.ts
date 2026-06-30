import { DatePipe } from '@angular/common';
import { Component, OnDestroy, effect, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe],
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
          @if (auth.hasPermission('residential.view')) {
            <a routerLink="/residential" routerLinkActive="active">Residencial</a>
          }
          @if (auth.hasPermission('users.view')) {
            <a routerLink="/admin/usuarios" routerLinkActive="active">Administración</a>
          }
        </nav>
        <div class="user">
          <span>{{ auth.currentUser()?.fullName ?? auth.currentUser()?.email }}</span>
          <button type="button" (click)="auth.logout()">Salir</button>
        </div>
      </aside>
      <div class="main-column">
        <header class="topbar">
          @if (auth.hasPermission('notifications.view')) {
            <div class="notifications" (click)="$event.stopPropagation()">
              <button type="button" class="bell" (click)="notifications.togglePanel()" aria-label="Notificaciones">
                🔔
                @if (notifications.unreadCount() > 0) {
                  <span class="badge">{{ notifications.unreadCount() }}</span>
                }
              </button>
              @if (notifications.panelOpen()) {
                <div class="panel">
                  <div class="panel-header">
                    <strong>Notificaciones</strong>
                    @if (notifications.unreadCount() > 0) {
                      <button type="button" class="link-btn" (click)="notifications.markAllRead()">
                        Marcar todas leídas
                      </button>
                    }
                  </div>
                  @if (notifications.loading()) {
                    <p class="panel-empty">Cargando...</p>
                  } @else if (notifications.notifications().length === 0) {
                    <p class="panel-empty">Sin notificaciones</p>
                  } @else {
                    <ul>
                      @for (n of notifications.notifications(); track n.id) {
                        <li [class.unread]="!n.readAt" (click)="onNotificationClick(n.id, !!n.readAt)">
                          <strong>{{ n.title }}</strong>
                          @if (n.body) {
                            <span>{{ n.body }}</span>
                          }
                          <small>{{ n.createdAt | date: 'short' }}</small>
                        </li>
                      }
                    </ul>
                  }
                </div>
              }
            </div>
          }
        </header>
        <main class="content">
          <router-outlet />
        </main>
      </div>
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
    }
    .main-column {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    .topbar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 0.75rem 2rem;
      background: var(--coraza-surface);
      border-bottom: 1px solid var(--coraza-border);
    }
    .notifications { position: relative; }
    .bell {
      position: relative;
      background: transparent;
      border: 1px solid var(--coraza-border);
      border-radius: 999px;
      padding: 0.35rem 0.65rem;
      cursor: pointer;
      font-size: 1rem;
    }
    .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #dc3545;
      color: #fff;
      font-size: 0.65rem;
      min-width: 1.1rem;
      height: 1.1rem;
      border-radius: 999px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .panel {
      position: absolute;
      right: 0;
      top: calc(100% + 0.35rem);
      width: 320px;
      max-height: 400px;
      overflow: auto;
      background: #fff;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      box-shadow: var(--coraza-shadow);
      z-index: 20;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--coraza-border);
    }
    .link-btn {
      background: none;
      border: none;
      color: var(--primary);
      cursor: pointer;
      font-size: 0.75rem;
    }
    .panel ul { list-style: none; margin: 0; padding: 0; }
    .panel li {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--coraza-border);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .panel li.unread { background: var(--primary-50); }
    .panel li span { font-size: 0.85rem; color: var(--coraza-text-muted); }
    .panel li small { font-size: 0.75rem; color: var(--coraza-text-muted); }
    .panel-empty { padding: 1rem; margin: 0; color: var(--coraza-text-muted); font-size: 0.9rem; }
    .content {
      padding: 1.5rem 2rem;
      background: var(--bg-page);
      flex: 1;
    }
  `,
  host: {
    '(document:click)': 'onDocumentClick()',
  },
})
export class MainLayout implements OnDestroy {
  readonly auth = inject(AuthService);
  readonly notifications = inject(NotificationService);

  private readonly syncNotifications = effect(() => {
    const user = this.auth.currentUser();
    if (user) {
      this.notifications.connect();
    } else {
      this.notifications.disconnect();
    }
  });

  ngOnDestroy(): void {
    this.notifications.disconnect();
  }

  onDocumentClick(): void {
    if (this.notifications.panelOpen()) {
      this.notifications.closePanel();
    }
  }

  onNotificationClick(id: string, isRead: boolean): void {
    if (!isRead) {
      this.notifications.markAsRead(id);
    }
  }
}
