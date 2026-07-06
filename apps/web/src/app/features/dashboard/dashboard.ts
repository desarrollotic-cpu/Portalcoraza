import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DashboardApiService, DashboardStats } from './dashboard-api.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  template: `
    <section>
      <h2>Dashboard</h2>
      <p>Bienvenido, {{ auth.currentUser()?.fullName ?? 'usuario' }}.</p>
      <p class="role">Rol: {{ auth.currentUser()?.role?.name }}</p>

      @if (loading()) {
        <p>Cargando indicadores...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <div class="cards">
          @if (roleCode() === 'GERENCIA') {
            <article>
              <h3>Asociados activos</h3>
              <p class="metric">{{ stats().activeAssociates ?? 0 }}</p>
              <a routerLink="/rrhh">Ver asociados</a>
            </article>
            <article>
              <h3>Dotaciones pendientes</h3>
              <p class="metric">{{ stats().pendingDeliveries ?? 0 }}</p>
              <a routerLink="/dotacion/entregas">Ver entregas</a>
            </article>
            <article>
              <h3>Documentos a revisar</h3>
              <p class="metric">{{ stats().documentsToReview ?? 0 }}</p>
              <a routerLink="/documental">Ver documental</a>
            </article>
            <article>
              <h3>Novedades abiertas</h3>
              <p class="metric">{{ stats().openIncidents ?? 0 }}</p>
            </article>
            <article>
              <h3>Reservas pendientes</h3>
              <p class="metric">{{ stats().pendingReservations ?? 0 }}</p>
              <a routerLink="/residential/reservas">Ver reservas</a>
            </article>
          }

          @if (roleCode() === 'SUPERVISOR') {
            <article>
              <h3>Turnos del día</h3>
              <p class="metric">{{ stats().todayShifts ?? 0 }}</p>
              <a routerLink="/programacion">Ver programación</a>
            </article>
            <article>
              <h3>Entregas pendientes</h3>
              <p class="metric">{{ stats().pendingDeliveries ?? 0 }}</p>
              <a routerLink="/dotacion/entregas">Ver entregas</a>
            </article>
            <article>
              <h3>Novedades abiertas</h3>
              <p class="metric">{{ stats().openIncidents ?? 0 }}</p>
            </article>
          }

          @if (roleCode() === 'ADMINISTRADOR_UNIDAD') {
            <article>
              <h3>Visitantes activos</h3>
              <p class="metric">{{ stats().activeVisitors ?? 0 }}</p>
              <a routerLink="/residential/visitantes">Ver visitantes</a>
            </article>
            <article>
              <h3>Paquetes pendientes</h3>
              <p class="metric">{{ stats().pendingPackages ?? 0 }}</p>
              <a routerLink="/residential/paquetes">Ver paquetes</a>
            </article>
            <article>
              <h3>Reservas pendientes</h3>
              <p class="metric">{{ stats().pendingReservations ?? 0 }}</p>
              <a routerLink="/residential/reservas">Ver reservas</a>
            </article>
            <article>
              <h3>Novedades abiertas</h3>
              <p class="metric">{{ stats().openIncidents ?? 0 }}</p>
            </article>
          }

          @if (!isKnownRole()) {
            <article>
              <h3>Portal Coraza</h3>
              <p>Use el menú lateral para acceder a los módulos disponibles según sus permisos.</p>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: `
    h2 { margin-top: 0; color: var(--primary-dark); font-weight: 600; }
    .role { color: var(--coraza-text-muted); }
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
    article h3 { margin: 0 0 0.5rem; font-size: 1rem; color: var(--primary-main); }
    .metric { margin: 0; font-size: 2rem; font-weight: 600; color: var(--primary-dark); }
    article a { display: inline-block; margin-top: 0.75rem; font-size: 0.85rem; color: var(--primary); }
    .error { color: var(--coraza-error); }
  `,
})
export class Dashboard implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(DashboardApiService);

  readonly stats = signal<Partial<DashboardStats>>({});
  readonly roleCode = signal('');
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const code = this.auth.currentUser()?.role?.code ?? '';
    this.roleCode.set(code);

    if (!['GERENCIA', 'SUPERVISOR', 'ADMINISTRADOR_UNIDAD'].includes(code)) {
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
    return ['GERENCIA', 'SUPERVISOR', 'ADMINISTRADOR_UNIDAD'].includes(this.roleCode());
  }
}
