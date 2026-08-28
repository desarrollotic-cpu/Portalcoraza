import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MinutaApiService } from '../minuta-api.service';
import { MINUTA_PAGE_STYLES } from '../minuta.shared';

@Component({
  selector: 'app-minuta-inicio',
  imports: [RouterLink],
  template: `
    <section class="page">
      <div>
        <h2>Inicio del puesto</h2>
        <p class="hint">Resumen del día (hora Bogotá). Solo ves la minuta de tu puesto asignado.</p>
      </div>
      <section class="stats">
        <article><small>Registros hoy</small><b>{{ stats().registrosHoy }}</b></article>
        <article><small>Visitantes</small><b>{{ stats().visitantesHoy }}</b></article>
        <article><small>Incidentes</small><b>{{ stats().incidentesHoy }}</b></article>
        <article><small>Eficiencia</small><b>{{ stats().eficiencia }}%</b></article>
      </section>
      <section class="quick">
        <a class="tile" routerLink="/nuevo">Registrar novedad</a>
        <a class="tile" routerLink="/historial">Ver historial</a>
      </section>
      <h3>Recientes</h3>
      @for (h of historial().slice(0, 5); track h['id']) {
        <div class="card">
          <strong>{{ h['tipo'] }}</strong>
          <span class="muted">
            {{ h['id'] }} · {{ h['estado'] || '—' }}
            @if (detalles(h)['registradoPor']) {
              · {{ detalles(h)['registradoPor'] }}
            }
          </span>
        </div>
      } @empty {
        <p class="muted">Sin registros aún.</p>
      }
    </section>
  `,
  styles: [MINUTA_PAGE_STYLES, `.tile { display:block; text-decoration:none; }`],
})
export class MinutaInicio implements OnInit {
  private readonly api = inject(MinutaApiService);
  readonly stats = signal({
    registrosHoy: 0,
    visitantesHoy: 0,
    incidentesHoy: 0,
    eficiencia: 100,
  });
  readonly historial = signal<Record<string, unknown>[]>([]);

  ngOnInit(): void {
    this.api.dashboard().subscribe({
      next: (d) => this.stats.set(d.stats),
      error: () => undefined,
    });
    this.api.historial(10, 'TODOS').subscribe({
      next: (r) => this.historial.set((r.historial || []) as Record<string, unknown>[]),
      error: () => this.historial.set([]),
    });
  }

  detalles(h: Record<string, unknown>): Record<string, unknown> {
    return (h['detalles'] as Record<string, unknown>) || h;
  }
}
