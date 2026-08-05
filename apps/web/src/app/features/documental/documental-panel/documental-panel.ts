import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Alert, Analytics, DocumentalApiService } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';

@Component({
  selector: 'app-documental-panel',
  imports: [],
  template: `
    @if (loading()) {
      <p>Cargando panel...</p>
    } @else {
      <div class="kpis">
        <div class="kpi"><div class="n">{{ a()?.correspondencia ?? 0 }}</div><div class="l">Correspondencia</div></div>
        <div class="kpi"><div class="n">{{ a()?.minutas ?? 0 }}</div><div class="l">Minutas</div></div>
        <div class="kpi"><div class="n">{{ a()?.contratos ?? 0 }}</div><div class="l">Contratos</div></div>
        <div class="kpi"><div class="n">{{ a()?.asociadosRetirados ?? 0 }}</div><div class="l">Asociados retirados</div></div>
        <div class="kpi"><div class="n">{{ a()?.prestamosActivos ?? 0 }}</div><div class="l">Préstamos activos</div></div>
        <div class="kpi"><div class="n">{{ a()?.prestamosDevueltos ?? 0 }}</div><div class="l">Préstamos devueltos</div></div>
      </div>

      <h3>Alertas ({{ alerts().length }})</h3>
      @if (alerts().length === 0) {
        <p class="muted">Sin alertas de vencimiento.</p>
      } @else {
        <table>
          <thead><tr><th>Nivel</th><th>Título</th><th>Detalle</th></tr></thead>
          <tbody>
            @for (al of alerts(); track al.idRegistro + al.tipo) {
              <tr>
                <td><span class="badge" [class.crit]="al.nivel === 'critico'" [class.warn]="al.nivel !== 'critico'">{{ al.nivel }}</span></td>
                <td>{{ al.titulo }}</td>
                <td>{{ al.mensaje }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    }
  `,
  styles: [DOC_STYLES],
})
export class DocumentalPanel implements OnInit {
  private readonly api = inject(DocumentalApiService);
  readonly a = signal<Analytics | null>(null);
  readonly alerts = signal<Alert[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    forkJoin({ analytics: this.api.analytics(), notifs: this.api.notifications() }).subscribe({
      next: ({ analytics, notifs }) => {
        this.a.set(analytics);
        this.alerts.set(notifs.alertas);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
