import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { StatsKpiGrid, StatsKpiItem } from '../../../shared/components/stats-kpi-grid/stats-kpi-grid';
import { Alert, Analytics, DocumentalApiService } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';

@Component({
  selector: 'app-documental-panel',
  imports: [StatsKpiGrid],
  template: `
    @if (error()) {
      <p class="muted">{{ error() }}</p>
    }

    <app-stats-kpi-grid [items]="kpiItems()" [loading]="loading()" />

    <h3>Alertas ({{ alerts().length }})</h3>
    @if (loading()) {
      <p class="muted">Cargando…</p>
    } @else if (alerts().length === 0) {
      <p class="muted">Sin alertas de vencimiento.</p>
    } @else {
      <table>
        <thead>
          <tr>
            <th>Nivel</th>
            <th>Título</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          @for (al of alerts(); track al.idRegistro + al.tipo) {
            <tr>
              <td>
                <span
                  class="badge"
                  [class.crit]="al.nivel === 'critico'"
                  [class.warn]="al.nivel !== 'critico'"
                  >{{ al.nivel }}</span
                >
              </td>
              <td>{{ al.titulo }}</td>
              <td>{{ al.mensaje }}</td>
            </tr>
          }
        </tbody>
      </table>
    }
  `,
  styles: [DOC_STYLES],
})
export class DocumentalPanel implements OnInit {
  private readonly api = inject(DocumentalApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly a = signal<Analytics | null>(null);
  readonly alerts = signal<Alert[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly kpiItems = computed<StatsKpiItem[]>(() => {
    const x = this.a();
    return [
      {
        label: 'Correspondencia',
        value: x?.correspondencia ?? '—',
        link: '/documental/correspondencia',
      },
      { label: 'Minutas', value: x?.minutas ?? '—', link: '/documental/minutas' },
      { label: 'Contratos', value: x?.contratos ?? '—', link: '/documental/contratos' },
      {
        label: 'Asociados retirados',
        value: x?.asociadosRetirados ?? '—',
        link: '/documental/asociados',
      },
      {
        label: 'Préstamos activos',
        value: x?.prestamosActivos ?? '—',
        link: '/documental/prestamos',
        warn: (x?.prestamosActivos ?? 0) > 0,
      },
      {
        label: 'Préstamos devueltos',
        value: x?.prestamosDevueltos ?? '—',
        link: '/documental/prestamos',
      },
    ];
  });

  ngOnInit(): void {
    if (
      !this.auth.hasPermission('documental.view') &&
      this.auth.hasPermission('documental.loans')
    ) {
      void this.router.navigate(['/documental/prestamos']);
      return;
    }
    forkJoin({ analytics: this.api.analytics(), notifs: this.api.notifications() }).subscribe({
      next: ({ analytics, notifs }) => {
        this.a.set(analytics);
        this.alerts.set(notifs.alertas);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error cargando el panel documental');
        this.loading.set(false);
      },
    });
  }
}
