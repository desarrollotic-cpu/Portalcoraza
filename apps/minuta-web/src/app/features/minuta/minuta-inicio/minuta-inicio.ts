import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MinutaApiService } from '../minuta-api.service';
import { MINUTA_PAGE_STYLES, labelForMinutaTipo } from '../minuta.shared';

@Component({
  selector: 'app-minuta-inicio',
  imports: [RouterLink],
  template: `
    <section class="page">
      <div>
        <h2>Tu turno</h2>
        <p class="hint">Resumen de hoy (hora Bogotá). Solo ves la minuta de tu puesto.</p>
      </div>
      <section class="quick">
        <a class="tile tile-primary" routerLink="/nuevo">Registrar entrada / novedad</a>
        <a class="tile tile-secondary" routerLink="/historial">Ver lo registrado</a>
      </section>
      <section class="stats">
        <article><small>Hoy</small><b>{{ stats().registrosHoy }}</b></article>
        <article><small>Visitantes</small><b>{{ stats().visitantesHoy }}</b></article>
        <article><small>Incidentes</small><b>{{ stats().incidentesHoy }}</b></article>
        <article><small>Al día</small><b>{{ stats().eficiencia }}%</b></article>
      </section>
      <h3>Últimos registros</h3>
      @for (h of historial().slice(0, 5); track h['id']) {
        <div class="card">
          <strong>{{ tipoLabel(h['tipo']) }}</strong>
          <span class="muted">
            {{ estadoLabel(h['estado']) }}
            @if (detalles(h)['registradoPor']) {
              · {{ detalles(h)['registradoPor'] }}
            }
          </span>
        </div>
      } @empty {
        <p class="muted">Aún no hay registros. Toca “Registrar” para empezar.</p>
      }
    </section>
  `,
  styles: [MINUTA_PAGE_STYLES],
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

  tipoLabel(tipo: unknown): string {
    return labelForMinutaTipo(tipo);
  }

  estadoLabel(estado: unknown): string {
    const e = String(estado || '').toUpperCase();
    if (e === 'ACTIVO') return 'En el puesto';
    if (e === 'PENDIENTE') return 'Pendiente';
    if (e === 'ENTREGADO') return 'Entregado';
    if (e === 'SALIDA' || e === 'CERRADO') return 'Salida';
    if (e === 'ENTREGANDO') return 'En entrega';
    return e || '—';
  }

  detalles(h: Record<string, unknown>): Record<string, unknown> {
    return (h['detalles'] as Record<string, unknown>) || h;
  }
}
