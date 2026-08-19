import { Component, OnInit, Type, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowUpRight,
  LucideBoxes,
  LucideBuilding2,
  LucideCalendarCheck,
  LucideClipboardCheck,
  LucideEye,
  LucideFileText,
  LucideShieldCheck,
  LucideSparkles,
  LucideUsersRound,
} from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { Icon } from '../../shared/components/icon/icon';
import {
  DashboardAlertChip,
  DashboardApiService,
  DashboardHome,
  DashboardSection,
} from './dashboard-api.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, Icon],
  template: `
    <section class="dashboard">
      <header class="hero">
        <div class="hero-mesh"></div>
        <div class="hero-inner">
          <div class="hero-text">
            <span class="hero-badge">
              <app-icon [icon]="icons.Sparkles" [size]="14" [strokeWidth]="2.2" />
              Portal Coraza
            </span>
            <h1>Hola, {{ firstName() }}</h1>
            <p>
              Este es tu resumen operativo de hoy.
              @if (roleName()) {
                Rol activo: <strong>{{ roleName() }}</strong>.
              }
            </p>

            <div class="hero-actions">
              @if (auth.hasPermission('associates.view')) {
                <a routerLink="/rrhh" class="hero-btn primary">
                  <app-icon [icon]="icons.UsersRound" [size]="16" [strokeWidth]="2" />
                  Ir a Gestión Humana
                </a>
              }
              @if (auth.hasPermission('scheduling.view')) {
                <a routerLink="/programacion" class="hero-btn ghost">
                  <app-icon [icon]="icons.CalendarCheck" [size]="16" [strokeWidth]="2" />
                  Ir a Programación
                </a>
              }
              @if (auth.hasPermission('documental.view')) {
                <a routerLink="/documental" class="hero-btn ghost">
                  <app-icon [icon]="icons.FileText" [size]="16" [strokeWidth]="2" />
                  Ir a Documental
                </a>
              }
              @if (auth.hasPermission('inventory.view') || auth.hasPermission('deliveries.view')) {
                <a routerLink="/dotacion" class="hero-btn ghost">
                  <app-icon [icon]="icons.Boxes" [size]="16" [strokeWidth]="2" />
                  Módulo Dotación
                </a>
              }
              @if (auth.hasPermission('reception.view')) {
                <a routerLink="/recepcion" class="hero-btn ghost">
                  <app-icon [icon]="icons.Building2" [size]="16" [strokeWidth]="2" />
                  Recepción
                </a>
              }
              @if (auth.hasPermission('users.view')) {
                <a routerLink="/admin" class="hero-btn ghost">
                  <app-icon [icon]="icons.ShieldCheck" [size]="16" [strokeWidth]="2" />
                  Administración
                </a>
              }
              @if (auth.hasPermission('vigia.view') || auth.hasPermission('posts.view')) {
                <a routerLink="/vigilantes" class="hero-btn ghost">
                  <app-icon [icon]="icons.Eye" [size]="16" [strokeWidth]="2" />
                  Vigilante
                </a>
              }
            </div>
          </div>

          <div class="hero-info">
            <div class="info-card">
              <div class="info-icon" style="--g: var(--gradient-accent);">
                <app-icon [icon]="icons.ShieldCheck" [size]="18" [strokeWidth]="2" />
              </div>
              <div>
                <span class="info-title">Sesión segura</span>
                <span class="info-sub">Sesión JWT activa</span>
              </div>
            </div>
            <div class="info-card">
              <div class="info-icon" style="--g: var(--gradient-success);">
                <app-icon [icon]="icons.ClipboardCheck" [size]="18" [strokeWidth]="2" />
              </div>
              <div>
                <span class="info-title">Módulos activos</span>
                <span class="info-sub">{{ modulesCount() }} disponibles</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      @if (loading()) {
        <div class="skeleton-grid">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="skeleton"></div>
          }
        </div>
      } @else if (error()) {
        <div class="alert-error">
          <span class="alert-dot"></span>
          {{ error() }}
        </div>
      } @else {
        <section class="alerts-strip">
          <div class="alerts-head">
            <h2>Hoy / Alertas</h2>
            <span class="muted">Lo más urgente según tus permisos</span>
          </div>
          @if (alerts().length === 0) {
            <p class="alerts-empty">Sin alertas operativas</p>
          } @else {
            <div class="chips">
              @for (a of alerts(); track a.id) {
                <a [routerLink]="a.route" class="chip" [attr.data-tone]="a.tone">
                  <span class="chip-label">{{ a.label }}</span>
                  <strong class="chip-value">{{ a.value }}</strong>
                  <app-icon [icon]="icons.ArrowUpRight" [size]="14" [strokeWidth]="2" />
                </a>
              }
            </div>
          }
        </section>

        @if (sections().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">
              <app-icon [icon]="icons.Sparkles" [size]="26" [strokeWidth]="1.8" />
            </div>
            <h3>Bienvenido a Portal Coraza</h3>
            <p>Usa el menú lateral para acceder a los módulos disponibles según tus permisos.</p>
          </div>
        } @else {
          <div class="sections-grid">
            @for (s of sections(); track s.key) {
              <article class="module-card">
                <header class="module-head">
                  <div>
                    <h3>{{ s.title }}</h3>
                    @if (s.status === 'error') {
                      <p class="module-error">{{ s.errorMessage }}</p>
                    }
                  </div>
                  <a [routerLink]="s.route" class="kpi-link" [attr.aria-label]="'Ir a ' + s.title">
                    <app-icon [icon]="icons.ArrowUpRight" [size]="16" [strokeWidth]="2" />
                  </a>
                </header>
                @if (s.status === 'ok' && s.kpis.length) {
                  <div class="module-kpis">
                    @for (k of s.kpis; track k.label) {
                      @if (k.route) {
                        <a [routerLink]="k.route" class="mini-kpi">
                          <span class="mini-label">{{ k.label }}</span>
                          <strong>{{ k.value }}</strong>
                          @if (k.hint) {
                            <span class="mini-hint">{{ k.hint }}</span>
                          }
                        </a>
                      } @else {
                        <div class="mini-kpi">
                          <span class="mini-label">{{ k.label }}</span>
                          <strong>{{ k.value }}</strong>
                          @if (k.hint) {
                            <span class="mini-hint">{{ k.hint }}</span>
                          }
                        </div>
                      }
                    }
                  </div>
                }
                <a [routerLink]="s.route" class="kpi-cta">
                  Ir a {{ s.title }}
                  <app-icon [icon]="icons.ArrowUpRight" [size]="14" [strokeWidth]="2" />
                </a>
              </article>
            }
          </div>
        }
      }
    </section>
  `,
  styles: `
    .dashboard {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    .hero {
      position: relative;
      overflow: hidden;
      border-radius: var(--radius-xl);
      background: var(--gradient-hero-mesh);
      color: #fff;
      box-shadow: var(--shadow-lg);
    }
    .hero-mesh {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(at 90% 20%, rgba(34, 211, 238, 0.35) 0px, transparent 55%),
        radial-gradient(at 15% 80%, rgba(236, 72, 153, 0.28) 0px, transparent 55%);
      pointer-events: none;
    }
    .hero-inner {
      position: relative;
      z-index: 1;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 2rem;
      padding: 2rem 2.25rem;
      flex-wrap: wrap;
    }
    .hero-text { max-width: 620px; }
    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.75rem;
      background: rgba(255, 255, 255, 0.14);
      backdrop-filter: blur(10px);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 1rem;
    }
    .hero-text h1 {
      margin: 0;
      font-family: var(--font-display);
      font-size: clamp(1.85rem, 3vw, 2.4rem);
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #fff;
    }
    .hero-text p {
      margin: 0.65rem 0 1.35rem;
      color: rgba(255, 255, 255, 0.82);
      font-size: 1rem;
      line-height: 1.5;
    }
    .hero-text p strong { color: #fff; font-weight: 600; }
    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
    }
    .hero-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.65rem 1.1rem;
      border-radius: 999px;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
    }
    .hero-btn.primary {
      background: #fff;
      color: var(--primary-700);
      box-shadow: 0 12px 24px rgba(15, 23, 42, 0.2);
    }
    .hero-btn.primary:hover {
      transform: translateY(-1px);
      color: var(--primary-800);
    }
    .hero-btn.ghost {
      background: rgba(255, 255, 255, 0.14);
      color: #fff;
      border: 1px solid rgba(255, 255, 255, 0.28);
    }
    .hero-btn.ghost:hover { background: rgba(255, 255, 255, 0.24); }

    .hero-info {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      min-width: 260px;
    }
    .info-card {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.75rem 0.95rem;
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: var(--radius);
    }
    .info-icon {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: var(--g);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .info-title {
      display: block;
      font-size: 0.85rem;
      color: #fff;
      font-weight: 600;
    }
    .info-sub {
      display: block;
      font-size: 0.72rem;
      color: rgba(255, 255, 255, 0.75);
    }

    .alerts-strip {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.1rem 1.25rem;
      box-shadow: var(--shadow);
    }
    .alerts-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 0.85rem;
      flex-wrap: wrap;
    }
    .alerts-head h2 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.15rem;
      color: var(--text-primary);
    }
    .muted { color: var(--text-muted); font-size: 0.85rem; }
    .alerts-empty {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.55rem 0.85rem;
      border-radius: 999px;
      text-decoration: none;
      border: 1px solid var(--border);
      background: var(--surface-2);
      color: var(--text-primary);
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .chip:hover {
      transform: translateY(-1px);
      border-color: var(--primary-200);
    }
    .chip-label { font-size: 0.8rem; color: var(--text-secondary); }
    .chip-value {
      font-family: var(--font-display);
      font-size: 1.05rem;
    }
    .chip[data-tone='danger'] {
      background: rgba(239, 68, 68, 0.08);
      border-color: rgba(239, 68, 68, 0.25);
    }
    .chip[data-tone='warn'] {
      background: rgba(245, 158, 11, 0.1);
      border-color: rgba(245, 158, 11, 0.28);
    }
    .chip[data-tone='info'] {
      background: rgba(37, 99, 235, 0.08);
      border-color: rgba(37, 99, 235, 0.22);
    }

    .sections-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
    .module-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.15rem 1.25rem 1.1rem;
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    }
    .module-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
      border-color: var(--primary-200);
    }
    .module-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
    }
    .module-head h3 {
      margin: 0;
      font-family: var(--font-display);
      font-size: 1.1rem;
      color: var(--text-primary);
    }
    .module-error {
      margin: 0.35rem 0 0;
      color: var(--error-dark, #b91c1c);
      font-size: 0.8rem;
    }
    .module-kpis {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.55rem;
    }
    .mini-kpi {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      padding: 0.65rem 0.7rem;
      border-radius: 10px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      text-decoration: none;
      color: inherit;
    }
    .mini-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted);
      font-weight: 600;
    }
    .mini-kpi strong {
      font-family: var(--font-display);
      font-size: 1.35rem;
      color: var(--text-primary);
      line-height: 1.1;
    }
    .mini-hint {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    .kpi-link {
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: var(--surface-2);
      border: 1px solid var(--border);
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .kpi-link:hover {
      background: var(--primary-50);
      color: var(--primary-700);
    }
    .kpi-cta {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      margin-top: auto;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--primary-700);
      text-decoration: none;
    }
    .kpi-cta:hover { color: var(--primary-800); }

    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }
    .skeleton {
      height: 140px;
      border-radius: var(--radius-lg);
      background: linear-gradient(90deg, var(--surface-2) 25%, var(--border) 50%, var(--surface-2) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.2s infinite;
    }
    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .alert-error {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.9rem 1.1rem;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: var(--radius);
      color: var(--error-dark);
      font-size: 0.9rem;
    }
    .alert-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: var(--error);
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.18);
    }
    .empty-state {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 2.5rem 2rem;
      text-align: center;
      box-shadow: var(--shadow);
    }
    .empty-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      border-radius: 20px;
      background: var(--gradient-primary-soft);
      color: var(--primary-600);
      margin-bottom: 1rem;
    }
    .empty-state h3 {
      margin: 0 0 0.35rem;
      font-family: var(--font-display);
      color: var(--text-primary);
    }
    .empty-state p {
      margin: 0;
      color: var(--text-secondary);
    }
  `,
})
export class Dashboard implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(DashboardApiService);

  readonly icons = {
    ArrowUpRight: LucideArrowUpRight,
    Boxes: LucideBoxes,
    Building2: LucideBuilding2,
    CalendarCheck: LucideCalendarCheck,
    ClipboardCheck: LucideClipboardCheck,
    Eye: LucideEye,
    FileText: LucideFileText,
    ShieldCheck: LucideShieldCheck,
    Sparkles: LucideSparkles,
    UsersRound: LucideUsersRound,
  };

  readonly home = signal<DashboardHome | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly firstName = computed(() => {
    const user = this.auth.currentUser();
    const name = user?.fullName ?? user?.email ?? '';
    return name.split(/[\s@]/)[0] || 'usuario';
  });

  readonly roleName = computed(() => this.auth.currentUser()?.role?.name ?? null);

  readonly modulesCount = computed(() => {
    const perms = this.auth.currentUser()?.permissions ?? [];
    const modules = new Set<string>();
    for (const p of perms) {
      const mod = p.split('.')[0];
      if (mod) modules.add(mod);
    }
    return modules.size;
  });

  readonly alerts = computed<DashboardAlertChip[]>(() => this.home()?.alerts ?? []);
  readonly sections = computed<DashboardSection[]>(() => this.home()?.sections ?? []);

  ngOnInit(): void {
    this.api.loadHome().subscribe({
      next: (data) => {
        this.home.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar los indicadores del dashboard');
      },
    });
  }
}
