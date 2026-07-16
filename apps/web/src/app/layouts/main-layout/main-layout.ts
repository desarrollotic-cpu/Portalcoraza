import { DatePipe } from '@angular/common';
import {
  Component,
  OnDestroy,
  Type,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import {
  LucideBell,
  LucideBoxes,
  LucideCalendarClock,
  LucideChevronDown,
  LucideClipboardList,
  LucideCog,
  LucideHome,
  LucideKeyRound,
  LucideLogOut,
  LucideSearch,
  LucideShieldCheck,
  LucideSparkles,
  LucideUserCog,
  LucideUsersRound,
  LucideDoorOpen,
} from '@lucide/angular';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { Icon } from '../../shared/components/icon/icon';
import { Toaster } from '../../shared/components/toaster/toaster';

interface NavItem {
  label: string;
  route: string;
  icon: Type<unknown>;
  permission?: string;
  permissions?: string[];
  match?: 'subset' | 'exact';
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe, Icon, Toaster, FormsModule],
  template: `
    <div class="layout">
      <aside class="sidebar">
        <div class="sidebar-inner">
          <div class="brand">
            <div class="brand-mark">
              <app-icon [icon]="icons.ShieldCheck" [size]="20" [strokeWidth]="2.2" />
            </div>
            <div class="brand-text">
              <span class="brand-name">Portal Coraza</span>
              <span class="brand-tag">Panel operativo</span>
            </div>
          </div>

          <nav class="nav">
            @for (group of visibleGroups(); track group.label) {
              <div class="nav-group">
                <span class="nav-group-label">{{ group.label }}</span>
                @for (item of group.items; track item.route) {
                  <a
                    [routerLink]="item.route"
                    routerLinkActive="active"
                    [routerLinkActiveOptions]="
                      item.match === 'exact'
                        ? { exact: true }
                        : { paths: 'subset', queryParams: 'ignored', fragment: 'ignored', matrixParams: 'ignored' }
                    "
                    class="nav-item"
                  >
                    <span class="nav-icon">
                      <app-icon [icon]="item.icon" [size]="18" [strokeWidth]="1.8" />
                    </span>
                    <span class="nav-label">{{ item.label }}</span>
                    <span class="nav-indicator"></span>
                  </a>
                }
              </div>
            }
          </nav>

          <div class="sidebar-footer">
            <div class="pro-card">
              <div class="pro-icon">
                <app-icon [icon]="icons.Sparkles" [size]="18" [strokeWidth]="2" />
              </div>
              <div class="pro-copy">
                <strong>Sistema activo</strong>
                <span>Módulos operativos actualizados</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div class="main-column">
        <header class="topbar">
          <div class="topbar-left">
            <p class="crumb">
              <app-icon [icon]="icons.Home" [size]="14" [strokeWidth]="1.8" />
              <span>{{ crumbRoot() }}</span>
              @if (crumbSection()) {
                <span class="crumb-sep">/</span>
                <span class="crumb-active">{{ crumbSection() }}</span>
              }
            </p>
            <h2 class="topbar-title">{{ topbarTitle() }}</h2>
          </div>

          <div class="topbar-right">
            <div class="search-box">
              <app-icon [icon]="icons.Search" [size]="16" [strokeWidth]="1.8" />
              <input type="search" placeholder="Buscar en el portal..." disabled />
              <kbd>Ctrl K</kbd>
            </div>

            @if (auth.hasPermission('notifications.view')) {
              <div class="notifications" (click)="$event.stopPropagation()">
                <button
                  type="button"
                  class="icon-btn bell"
                  (click)="notifications.togglePanel()"
                  aria-label="Notificaciones"
                >
                  <app-icon [icon]="icons.Bell" [size]="18" [strokeWidth]="1.8" />
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
                          <li
                            [class.unread]="!n.readAt"
                            (click)="onNotificationClick(n.id, !!n.readAt)"
                          >
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

            <div class="user-chip" (click)="toggleUserMenu($event)">
              <div class="avatar">{{ initials() }}</div>
              <div class="user-info">
                <span class="user-name">{{ auth.currentUser()?.fullName ?? 'Usuario' }}</span>
                <span class="user-role">{{ auth.currentUser()?.role?.name ?? '' }}</span>
              </div>
              <app-icon class="chev" [icon]="icons.ChevronDown" [size]="16" [strokeWidth]="2" />
              @if (userMenuOpen()) {
                <div class="user-menu" (click)="$event.stopPropagation()">
                  <span class="user-menu-hd">{{ auth.currentUser()?.email }}</span>
                  <button type="button" (click)="openChangePassword()">
                    <app-icon [icon]="icons.KeyRound" [size]="16" [strokeWidth]="1.9" />
                    Cambiar contraseña
                  </button>
                  <button type="button" (click)="auth.logout()">
                    <app-icon [icon]="icons.LogOut" [size]="16" [strokeWidth]="1.9" />
                    Cerrar sesión
                  </button>
                </div>
              }
            </div>
          </div>
        </header>

        <main class="content">
          <router-outlet />
        </main>
      </div>
      <app-toaster />

      @if (changePasswordOpen()) {
        <div class="modal-backdrop" (click)="closeChangePassword()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h3>Cambiar mi contraseña</h3>
            <p class="modal-hint">Usa tu contraseña actual y define una nueva (mínimo 8 caracteres).</p>
            <form class="modal-form" (ngSubmit)="submitChangePassword()">
              <label>
                Contraseña actual
                <input type="password" [(ngModel)]="pwForm.current" name="currentPw" required autocomplete="current-password" />
              </label>
              <label>
                Nueva contraseña
                <input type="password" [(ngModel)]="pwForm.next" name="newPw" required minlength="8" autocomplete="new-password" />
              </label>
              <label>
                Confirmar nueva
                <input type="password" [(ngModel)]="pwForm.confirm" name="confirmPw" required minlength="8" autocomplete="new-password" />
              </label>
              @if (pwError()) {
                <p class="pw-error">{{ pwError() }}</p>
              }
              @if (pwSuccess()) {
                <p class="pw-ok">{{ pwSuccess() }}</p>
              }
              <div class="modal-actions">
                <button type="button" class="btn-ghost" (click)="closeChangePassword()" [disabled]="pwSaving()">
                  Cancelar
                </button>
                <button type="submit" class="btn-primary" [disabled]="pwSaving()">
                  {{ pwSaving() ? 'Guardando...' : 'Guardar' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: `
    .layout {
      display: grid;
      grid-template-columns: 260px 1fr;
      min-height: 100vh;
    }

    .sidebar {
      position: sticky;
      top: 0;
      max-height: 100vh;
      background: var(--gradient-hero-mesh);
      color: #fff;
      padding: 0;
      overflow: hidden;
    }
    .sidebar::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(at 100% 0%, rgba(255, 255, 255, 0.12) 0%, transparent 40%),
        radial-gradient(at 0% 100%, rgba(34, 211, 238, 0.15) 0%, transparent 50%);
      pointer-events: none;
    }
    .sidebar-inner {
      position: relative;
      z-index: 1;
      height: 100vh;
      display: flex;
      flex-direction: column;
      padding: 1.5rem 1rem 1.25rem;
      overflow-y: auto;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.5rem 0.35rem 1.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      margin-bottom: 1rem;
    }
    .brand-mark {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.14);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.25);
    }
    .brand-text {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
    }
    .brand-name {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 0.95rem;
      color: #fff;
      letter-spacing: -0.01em;
    }
    .brand-tag {
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.65);
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .nav {
      display: flex;
      flex-direction: column;
      gap: 1.35rem;
      flex: 1;
    }
    .nav-group {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .nav-group-label {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.5);
      padding: 0 0.85rem 0.5rem;
    }
    .nav-item {
      position: relative;
      display: flex;
      align-items: center;
      gap: 0.7rem;
      padding: 0.6rem 0.85rem;
      border-radius: var(--radius-sm);
      color: rgba(255, 255, 255, 0.75);
      font-size: 0.88rem;
      font-weight: 500;
      transition:
        background 0.15s ease,
        color 0.15s ease;
    }
    .nav-item:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
    .nav-item.active {
      background: rgba(255, 255, 255, 0.16);
      color: #fff;
      font-weight: 600;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.2),
        0 6px 16px rgba(15, 23, 42, 0.25);
    }
    .nav-item.active .nav-icon {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }
    .nav-item.active .nav-indicator {
      opacity: 1;
      transform: scaleY(1);
    }
    .nav-icon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.06);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.75);
      transition:
        background 0.15s ease,
        color 0.15s ease;
    }
    .nav-item:hover .nav-icon {
      background: rgba(255, 255, 255, 0.14);
      color: #fff;
    }
    .nav-indicator {
      position: absolute;
      right: 0.55rem;
      width: 4px;
      height: 22px;
      border-radius: 999px;
      background: linear-gradient(180deg, #22d3ee, #a855f7);
      opacity: 0;
      transform: scaleY(0.4);
      transition:
        opacity 0.15s ease,
        transform 0.2s ease;
    }

    .sidebar-footer {
      padding-top: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      margin-top: 1.25rem;
    }
    .pro-card {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 0.85rem;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: var(--radius);
    }
    .pro-icon {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: var(--gradient-accent);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow: 0 8px 20px rgba(168, 85, 247, 0.35);
    }
    .pro-copy {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }
    .pro-copy strong {
      font-size: 0.8rem;
      color: #fff;
    }
    .pro-copy span {
      font-size: 0.7rem;
      color: rgba(255, 255, 255, 0.7);
    }

    .main-column {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 1.75rem;
      background: rgba(255, 255, 255, 0.72);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 20;
    }
    .topbar-left {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      min-width: 0;
    }
    .crumb {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0;
      color: var(--text-muted);
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .crumb-sep {
      color: var(--neutral-300);
    }
    .crumb-active {
      color: var(--primary-600);
      font-weight: 600;
    }
    .topbar-title {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.2rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.85rem;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 999px;
      min-width: 260px;
      color: var(--text-muted);
    }
    .search-box input {
      border: none;
      background: transparent;
      padding: 0;
      color: var(--text-primary);
      font-size: 0.85rem;
      width: 100%;
    }
    .search-box input:focus {
      outline: none;
      box-shadow: none;
    }
    .search-box kbd {
      font-family: var(--font-sans);
      font-size: 0.65rem;
      font-weight: 600;
      background: var(--neutral-200);
      color: var(--text-secondary);
      border-radius: 6px;
      padding: 0.15rem 0.4rem;
      border-bottom: 1px solid var(--neutral-300);
    }

    .icon-btn {
      position: relative;
      width: 40px;
      height: 40px;
      border-radius: 999px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      color: var(--text-secondary);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition:
        background 0.15s ease,
        color 0.15s ease,
        transform 0.15s ease;
    }
    .icon-btn:hover {
      background: var(--primary-50);
      color: var(--primary-600);
      transform: translateY(-1px);
    }

    .notifications {
      position: relative;
    }
    .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      background: var(--gradient-warning);
      color: #fff;
      font-size: 0.68rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(239, 68, 68, 0.35);
    }
    .panel {
      position: absolute;
      right: 0;
      top: calc(100% + 0.5rem);
      width: 340px;
      max-height: 420px;
      overflow: auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      z-index: 30;
    }
    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--border);
    }
    .link-btn {
      background: none;
      border: none;
      color: var(--primary-600);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
    }
    .panel ul {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .panel li {
      padding: 0.85rem 1rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      cursor: pointer;
      transition: background 0.12s ease;
    }
    .panel li:hover {
      background: var(--primary-50);
    }
    .panel li.unread {
      background: rgba(99, 102, 241, 0.06);
    }
    .panel li span {
      font-size: 0.82rem;
      color: var(--text-secondary);
    }
    .panel li small {
      font-size: 0.72rem;
      color: var(--text-muted);
    }
    .panel-empty {
      padding: 1.25rem 1rem;
      margin: 0;
      color: var(--text-muted);
      font-size: 0.85rem;
      text-align: center;
    }

    .user-chip {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.4rem 0.6rem 0.4rem 0.4rem;
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 999px;
      cursor: pointer;
      transition: background 0.15s ease, box-shadow 0.15s ease;
    }
    .user-chip:hover {
      background: var(--primary-50);
      box-shadow: var(--shadow-sm);
    }
    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 999px;
      background: var(--gradient-primary);
      color: #fff;
      font-weight: 700;
      font-size: 0.75rem;
      letter-spacing: 0.02em;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 14px rgba(99, 102, 241, 0.3);
    }
    .user-info {
      display: flex;
      flex-direction: column;
      line-height: 1.1;
      min-width: 0;
    }
    .user-name {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 160px;
    }
    .user-role {
      font-size: 0.7rem;
      color: var(--text-muted);
    }
    .chev {
      color: var(--text-muted);
    }
    .user-menu {
      position: absolute;
      top: calc(100% + 0.5rem);
      right: 0;
      min-width: 220px;
      padding: 0.65rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      z-index: 30;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .user-menu-hd {
      display: block;
      padding: 0.4rem 0.65rem 0.55rem;
      font-size: 0.72rem;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
      margin-bottom: 0.3rem;
    }
    .user-menu button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: transparent;
      border: none;
      padding: 0.55rem 0.65rem;
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: 0.85rem;
      text-align: left;
      cursor: pointer;
      transition: background 0.12s ease;
    }
    .user-menu button:hover {
      background: var(--primary-50);
      color: var(--primary-700);
    }

    .content {
      padding: 1.75rem 1.75rem 2.5rem;
      flex: 1;
      min-width: 0;
    }

    @media (max-width: 1100px) {
      .search-box {
        display: none;
      }
    }
    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 72px 1fr;
      }
      .brand-text,
      .nav-label,
      .nav-group-label,
      .pro-copy {
        display: none;
      }
      .nav-item {
        justify-content: center;
      }
      .user-info {
        display: none;
      }
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 80;
      background: rgba(15, 23, 42, 0.45);
      display: grid;
      place-items: center;
      padding: 1rem;
    }
    .modal {
      width: min(420px, 100%);
      background: #fff;
      border-radius: 12px;
      padding: 1.25rem 1.35rem;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
    }
    .modal h3 {
      margin: 0 0 0.35rem;
      color: var(--primary-dark);
      font-size: 1.1rem;
    }
    .modal-hint {
      margin: 0 0 1rem;
      font-size: 0.85rem;
      color: var(--coraza-text-muted, #64748b);
    }
    .modal-form {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }
    .modal-form label {
      display: flex;
      flex-direction: column;
      gap: 0.3rem;
      font-size: 0.85rem;
      color: #475569;
    }
    .modal-form input {
      padding: 0.55rem 0.7rem;
      border: 1px solid var(--coraza-border, #e2e8f0);
      border-radius: 8px;
      font: inherit;
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 0.35rem;
    }
    .btn-ghost, .btn-primary {
      padding: 0.5rem 0.9rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
    }
    .btn-ghost {
      background: #f8fafc;
      border-color: #e2e8f0;
      color: #334155;
    }
    .btn-primary {
      background: var(--primary);
      color: #fff;
    }
    .btn-primary:disabled, .btn-ghost:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .pw-error { margin: 0; color: var(--coraza-error, #dc2626); font-size: 0.85rem; }
    .pw-ok { margin: 0; color: #15803d; font-size: 0.85rem; }
  `,
  host: {
    '(document:click)': 'onDocumentClick()',
  },
})
export class MainLayout implements OnDestroy {
  readonly auth = inject(AuthService);
  readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  readonly icons = {
    Bell: LucideBell,
    Boxes: LucideBoxes,
    CalendarClock: LucideCalendarClock,
    ChevronDown: LucideChevronDown,
    ClipboardList: LucideClipboardList,
    Cog: LucideCog,
    Home: LucideHome,
    KeyRound: LucideKeyRound,
    LogOut: LucideLogOut,
    Search: LucideSearch,
    ShieldCheck: LucideShieldCheck,
    DoorOpen: LucideDoorOpen,
    Sparkles: LucideSparkles,
    UserCog: LucideUserCog,
    UsersRound: LucideUsersRound,
  };

  readonly userMenuOpen = signal(false);
  readonly changePasswordOpen = signal(false);
  readonly pwSaving = signal(false);
  readonly pwError = signal<string | null>(null);
  readonly pwSuccess = signal<string | null>(null);
  pwForm = { current: '', next: '', confirm: '' };

  private readonly groups: NavGroup[] = [
    {
      label: 'General',
      items: [
        { label: 'Dashboard', route: '/dashboard', icon: LucideHome, match: 'exact' },
      ],
    },
    {
      label: 'Operación',
      items: [
        {
          label: 'Recursos Humanos',
          route: '/rrhh',
          icon: LucideUsersRound,
          permissions: ['associates.view', 'hr_dashboard.view'],
        },
        {
          label: 'Dotación',
          route: '/dotacion',
          icon: LucideBoxes,
          permission: 'inventory.view',
        },
        {
          label: 'Programación',
          route: '/programacion',
          icon: LucideCalendarClock,
          permission: 'scheduling.view',
        },
        {
          label: 'Documental',
          route: '/documental',
          icon: LucideClipboardList,
          permission: 'documental.view',
        },
        {
          label: 'Recepción',
          route: '/recepcion',
          icon: LucideDoorOpen,
          permission: 'reception.view',
        },
        {
          label: 'Residencial',
          route: '/residential',
          icon: LucideShieldCheck,
          permission: 'residential.view',
        },
      ],
    },
    {
      label: 'Sistema',
      items: [
        {
          label: 'Administración',
          route: '/admin',
          icon: LucideUserCog,
          permission: 'users.view',
        },
      ],
    },
  ];

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly visibleGroups = computed(() =>
    this.groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.permissions?.length) {
            return item.permissions.some((p) => this.auth.hasPermission(p));
          }
          return !item.permission || this.auth.hasPermission(item.permission);
        }),
      }))
      .filter((group) => group.items.length > 0),
  );

  readonly activeItem = computed(() => {
    const url = this.currentUrl();
    const flat = this.visibleGroups().flatMap((g) => g.items);
    return (
      flat
        .slice()
        .sort((a, b) => b.route.length - a.route.length)
        .find((item) => url === item.route || url.startsWith(`${item.route}/`)) ?? null
    );
  });

  readonly crumbRoot = computed(() => 'Portal Coraza');
  readonly crumbSection = computed(() => this.activeItem()?.label ?? '');
  readonly topbarTitle = computed(() => this.activeItem()?.label ?? 'Portal Coraza');

  readonly initials = computed(() => {
    const user = this.auth.currentUser();
    const name = user?.fullName ?? user?.email ?? '';
    const parts = name.split(/[\s@.]+/).filter(Boolean);
    if (parts.length === 0) return '·';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  });

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
    if (this.userMenuOpen()) {
      this.userMenuOpen.set(false);
    }
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.userMenuOpen.update((v) => !v);
  }

  openChangePassword(): void {
    this.userMenuOpen.set(false);
    this.pwForm = { current: '', next: '', confirm: '' };
    this.pwError.set(null);
    this.pwSuccess.set(null);
    this.changePasswordOpen.set(true);
  }

  closeChangePassword(): void {
    if (this.pwSaving()) return;
    this.changePasswordOpen.set(false);
  }

  submitChangePassword(): void {
    const current = this.pwForm.current;
    const next = this.pwForm.next;
    const confirm = this.pwForm.confirm;
    if (!current || !next || !confirm) {
      this.pwError.set('Completa todos los campos');
      return;
    }
    if (next.length < 8) {
      this.pwError.set('La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (next !== confirm) {
      this.pwError.set('La confirmación no coincide');
      return;
    }

    this.pwSaving.set(true);
    this.pwError.set(null);
    this.pwSuccess.set(null);
    this.auth.changePassword(current, next).subscribe({
      next: (res) => {
        this.pwSaving.set(false);
        this.pwSuccess.set(res.message || 'Contraseña actualizada');
        this.pwForm = { current: '', next: '', confirm: '' };
        setTimeout(() => this.changePasswordOpen.set(false), 1200);
      },
      error: (err) => {
        this.pwSaving.set(false);
        this.pwError.set(err?.error?.message ?? 'No se pudo cambiar la contraseña');
      },
    });
  }

  onNotificationClick(id: string, isRead: boolean): void {
    if (!isRead) {
      this.notifications.markAsRead(id);
    }
  }
}
