import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StatsKpiGrid, StatsKpiItem } from '../../../shared/components/stats-kpi-grid/stats-kpi-grid';
import { AdminApiService, UsersOverview } from '../admin-api.service';

@Component({
  selector: 'app-admin-panel',
  imports: [StatsKpiGrid, RouterLink, DatePipe],
  template: `
    <div class="admin-panel">
      <header class="admin-panel__head">
        <div>
          <h2>Panel de administración</h2>
          <p>Usuarios y roles del portal. Solo consulta en este panel.</p>
        </div>
        @if (auth.hasPermission('users.create')) {
          <a class="admin-panel__cta" routerLink="/admin/usuarios">Ir a usuarios</a>
        }
      </header>

      @if (error()) {
        <p class="admin-panel__error">{{ error() }}</p>
      }

      <app-stats-kpi-grid [items]="kpiItems()" [loading]="loading()" />

      <section class="admin-panel__list">
        <header>
          <h3>Últimos usuarios</h3>
        </header>
        @if (loading()) {
          <p class="admin-panel__muted">Cargando…</p>
        } @else if ((data()?.recentUsers?.length ?? 0) === 0) {
          <p class="admin-panel__muted">Sin usuarios</p>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Alta</th>
              </tr>
            </thead>
            <tbody>
              @for (u of data()?.recentUsers ?? []; track u.id) {
                <tr>
                  <td>{{ u.fullName }}</td>
                  <td>{{ u.email }}</td>
                  <td>{{ u.roleName }}</td>
                  <td>
                    <span class="badge" [class.on]="u.isActive">{{ u.isActive ? 'Activo' : 'Inactivo' }}</span>
                  </td>
                  <td>{{ u.createdAt | date: 'dd/MM/yyyy' }}</td>
                </tr>
              }
            </tbody>
          </table>
        }
      </section>
    </div>
  `,
  styles: `
    .admin-panel {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .admin-panel__head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
      flex-wrap: wrap;
    }
    .admin-panel__head h2 {
      margin: 0 0 0.25rem;
      font-size: 1.15rem;
    }
    .admin-panel__head p {
      margin: 0;
      color: var(--text-muted, var(--text-secondary));
      font-size: 0.9rem;
    }
    .admin-panel__cta {
      display: inline-flex;
      align-items: center;
      padding: 0.5rem 0.9rem;
      border-radius: 999px;
      background: var(--primary, #0369a1);
      color: #fff;
      text-decoration: none;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .admin-panel__error {
      margin: 0;
      color: var(--coraza-error, #b91c1c);
    }
    .admin-panel__list {
      padding: 1rem 1.1rem;
      border: 1px solid var(--border, var(--coraza-border));
      border-radius: var(--radius, 12px);
      background: var(--surface, var(--coraza-surface));
    }
    .admin-panel__list header h3 {
      margin: 0 0 0.85rem;
      font-size: 0.95rem;
    }
    .admin-panel__muted {
      margin: 0;
      color: var(--text-muted, var(--text-secondary));
      font-size: 0.88rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
    }
    th, td {
      text-align: left;
      padding: 0.55rem 0.35rem;
      border-bottom: 1px solid var(--border, var(--coraza-border));
    }
    th {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--text-secondary);
    }
    .badge {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-size: 0.72rem;
      font-weight: 600;
      background: var(--neutral-100, #f3f4f6);
      color: var(--neutral-600, #4b5563);
    }
    .badge.on {
      background: color-mix(in srgb, #16a34a 12%, var(--surface, #fff));
      color: #15803d;
    }
  `,
})
export class AdminPanel implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(AdminApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<UsersOverview | null>(null);

  readonly kpiItems = computed<StatsKpiItem[]>(() => {
    const k = this.data()?.kpis;
    const rolesLink = this.auth.hasPermission('roles.view') ? '/admin/roles' : null;
    return [
      {
        label: 'Usuarios activos',
        value: k?.usersActive ?? '—',
        hint: 'Pueden iniciar sesión',
        link: '/admin/usuarios',
      },
      {
        label: 'Usuarios inactivos',
        value: k?.usersInactive ?? '—',
        hint: 'Deshabilitados',
        link: '/admin/usuarios',
        warn: (k?.usersInactive ?? 0) > 0,
      },
      {
        label: 'Roles',
        value: k?.roles ?? '—',
        hint: 'Perfiles del sistema',
        link: rolesLink,
      },
    ];
  });

  ngOnInit(): void {
    this.api.getUsersOverview().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error cargando el panel de administración');
        this.loading.set(false);
      },
    });
  }
}
