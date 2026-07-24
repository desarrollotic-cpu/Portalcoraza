import { Component, OnInit, Type, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowUpRight,
  LucideBell,
  LucideBoxes,
  LucideBuilding2,
  LucideCalendarCheck,
  LucideClipboardCheck,
  LucideFileText,
  LucidePackageOpen,
  LucideShieldCheck,
  LucideSparkles,
  LucideTruck,
  LucideUsersRound,
} from '@lucide/angular';
import { AuthService } from '../../core/services/auth.service';
import { EXTERNAL_APPS } from '../../core/config/external-apps';
import { Icon } from '../../shared/components/icon/icon';
import { DashboardApiService, DashboardStats } from './dashboard-api.service';

interface KpiCard {
  label: string;
  value: number;
  icon: Type<unknown>;
  route?: string;
  externalUrl?: string;
  cta?: string;
  hint?: string;
  gradient: string;
}

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
                <a [href]="externalApps.gestionHumana" class="hero-btn primary" target="_blank" rel="noopener noreferrer">
                  <app-icon [icon]="icons.UsersRound" [size]="16" [strokeWidth]="2" />
                  Ir a Gestión Humana
                </a>
              }
              @if (auth.hasPermission('scheduling.view')) {
                <a [href]="externalApps.programacion" class="hero-btn ghost" target="_blank" rel="noopener noreferrer">
                  <app-icon [icon]="icons.CalendarCheck" [size]="16" [strokeWidth]="2" />
                  Ir a Programación
                </a>
              }
              @if (auth.hasPermission('documental.view')) {
                <a [href]="externalApps.documental" class="hero-btn ghost" target="_blank" rel="noopener noreferrer">
                  <app-icon [icon]="icons.FileText" [size]="16" [strokeWidth]="2" />
                  Ir a Documental
                </a>
              }
              @if (auth.hasPermission('inventory.view')) {
                <a routerLink="/dotacion" class="hero-btn ghost">
                  <app-icon [icon]="icons.Boxes" [size]="16" [strokeWidth]="2" />
                  Módulo Dotación
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
        @if (kpis().length > 0) {
          <div class="kpi-grid">
            @for (k of kpis(); track k.label) {
              <article class="kpi-card">
                <div class="kpi-top">
                  <div class="kpi-icon" [style.background]="k.gradient">
                    <app-icon [icon]="k.icon" [size]="20" [strokeWidth]="2" />
                  </div>
                  @if (k.externalUrl) {
                    <a [href]="k.externalUrl" class="kpi-link" [attr.aria-label]="k.cta ?? k.label" target="_blank" rel="noopener noreferrer">
                      <app-icon [icon]="icons.ArrowUpRight" [size]="16" [strokeWidth]="2" />
                    </a>
                  } @else if (k.route) {
                    <a [routerLink]="k.route" class="kpi-link" [attr.aria-label]="k.cta ?? k.label">
                      <app-icon [icon]="icons.ArrowUpRight" [size]="16" [strokeWidth]="2" />
                    </a>
                  }
                </div>
                <div class="kpi-body">
                  <span class="kpi-label">{{ k.label }}</span>
                  <strong class="kpi-value">{{ k.value }}</strong>
                  @if (k.hint) {
                    <span class="kpi-hint">{{ k.hint }}</span>
                  }
                </div>
                @if (k.externalUrl && k.cta) {
                  <a [href]="k.externalUrl" class="kpi-cta" target="_blank" rel="noopener noreferrer">
                    {{ k.cta }}
                    <app-icon [icon]="icons.ArrowUpRight" [size]="14" [strokeWidth]="2" />
                  </a>
                } @else if (k.route && k.cta) {
                  <a [routerLink]="k.route" class="kpi-cta">
                    {{ k.cta }}
                    <app-icon [icon]="icons.ArrowUpRight" [size]="14" [strokeWidth]="2" />
                  </a>
                }
              </article>
            }
          </div>
        }

        @if (!isKnownRole()) {
          <div class="empty-state">
            <div class="empty-icon">
              <app-icon [icon]="icons.Sparkles" [size]="26" [strokeWidth]="1.8" />
            </div>
            <h3>Bienvenido a Portal Coraza</h3>
            <p>Usa el menú lateral para acceder a los módulos disponibles según tus permisos.</p>
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
    .hero-text {
      max-width: 620px;
    }
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
    .hero-text p strong {
      color: #fff;
      font-weight: 600;
    }
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
      transition:
        background 0.15s ease,
        transform 0.15s ease,
        box-shadow 0.15s ease;
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
    .hero-btn.ghost:hover {
      background: rgba(255, 255, 255, 0.24);
    }

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

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }
    .kpi-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.15rem 1.25rem 1.25rem;
      box-shadow: var(--shadow);
      display: flex;
      flex-direction: column;
      gap: 1rem;
      transition:
        transform 0.18s ease,
        box-shadow 0.18s ease,
        border-color 0.18s ease;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
      border-color: var(--primary-200);
    }
    .kpi-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .kpi-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      box-shadow: var(--shadow-primary);
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
      transition:
        background 0.15s ease,
        color 0.15s ease;
    }
    .kpi-link:hover {
      background: var(--primary-50);
      color: var(--primary-700);
    }
    .kpi-body {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .kpi-label {
      font-size: 0.78rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
    }
    .kpi-value {
      font-family: var(--font-display);
      font-size: 2.2rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.03em;
      line-height: 1;
    }
    .kpi-hint {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }
    .kpi-cta {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: var(--primary-600);
      font-size: 0.85rem;
      font-weight: 600;
      text-decoration: none;
    }
    .kpi-cta:hover {
      color: var(--primary-700);
    }

    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }
    .skeleton {
      height: 152px;
      border-radius: var(--radius-lg);
      background: linear-gradient(
        90deg,
        var(--surface) 0%,
        var(--surface-2) 40%,
        var(--surface) 80%
      );
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border: 1px solid var(--border);
    }
    @keyframes shimmer {
      0% {
        background-position: 100% 0;
      }
      100% {
        background-position: -100% 0;
      }
    }

    .alert-error {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.85rem 1rem;
      background: var(--error-bg);
      border: 1px solid rgba(239, 68, 68, 0.2);
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
  readonly externalApps = EXTERNAL_APPS;

  readonly icons = {
    ArrowUpRight: LucideArrowUpRight,
    Bell: LucideBell,
    Boxes: LucideBoxes,
    Building2: LucideBuilding2,
    CalendarCheck: LucideCalendarCheck,
    ClipboardCheck: LucideClipboardCheck,
    FileText: LucideFileText,
    PackageOpen: LucidePackageOpen,
    ShieldCheck: LucideShieldCheck,
    Sparkles: LucideSparkles,
    Truck: LucideTruck,
    UsersRound: LucideUsersRound,
  };

  readonly stats = signal<Partial<DashboardStats>>({});
  readonly roleCode = signal('');
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

  readonly kpis = computed<KpiCard[]>(() => {
    const s = this.stats();
    const role = this.roleCode();
    const items: KpiCard[] = [];

    if (role === 'GERENCIA') {
      items.push(
        {
          label: 'Asociados activos',
          value: s.activeAssociates ?? 0,
          icon: LucideUsersRound,
          externalUrl: EXTERNAL_APPS.gestionHumana,
          cta: 'Ir a Gestión Humana',
          gradient: 'var(--gradient-primary)',
        },
        {
          label: 'Dotaciones pendientes',
          value: s.pendingDeliveries ?? 0,
          icon: LucideTruck,
          route: '/dotacion/entregas',
          cta: 'Ver entregas',
          gradient: 'var(--gradient-accent)',
        },
        {
          label: 'Documentos a revisar',
          value: s.documentsToReview ?? 0,
          icon: LucideFileText,
          externalUrl: EXTERNAL_APPS.documental,
          cta: 'Ir a Documental',
          gradient: 'var(--gradient-success)',
        },
        {
          label: 'Novedades abiertas',
          value: s.openIncidents ?? 0,
          icon: LucideBell,
          gradient: 'var(--gradient-warning)',
        },
        {
          label: 'Reservas pendientes',
          value: s.pendingReservations ?? 0,
          icon: LucideCalendarCheck,
          route: '/residential/reservas',
          cta: 'Ver reservas',
          gradient: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)',
        },
      );
    }

    return items;
  });

  ngOnInit(): void {
    const code = this.auth.currentUser()?.role?.code ?? '';
    this.roleCode.set(code);

    if (code !== 'GERENCIA') {
      this.loading.set(false);
      return;
    }

    this.api.loadForRole(code).subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron cargar los indicadores del dashboard');
      },
    });
  }

  isKnownRole(): boolean {
    return this.roleCode() === 'GERENCIA';
  }
}
