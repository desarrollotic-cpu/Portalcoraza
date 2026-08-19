import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MinutaApiService } from '../minuta-api.service';
import { MINUTA_PAGE_STYLES } from '../minuta.shared';

@Component({
  selector: 'app-minuta-historial',
  imports: [FormsModule],
  template: `
    <section class="page">
      <div>
        <h2>Historial del puesto</h2>
        <p class="hint">
          Consulta de novedades de tu puesto. Sin descarga PDF (solo Operaciones puede descargar).
        </p>
      </div>
      @if (msg()) {
        <p class="toast">{{ msg() }}</p>
      }
      <label class="filt">
        Tipo
        <select [(ngModel)]="filtroTipo" name="ft" (change)="load()">
          <option value="TODOS">Todos</option>
          <option value="VISITANTE">Visitantes</option>
          <option value="CORRESPONDENCIA">Correspondencia</option>
          <option value="CONTRATISTA">Contratistas</option>
          <option value="DOMICILIARIO">Domiciliarios</option>
          <option value="INCIDENTE">Incidentes</option>
          <option value="SERVICIO">Servicio</option>
          <option value="ENTREGA">Entrega</option>
        </select>
      </label>
      @for (h of historial(); track h['id']) {
        <div class="card row">
          <div>
            <strong>{{ h['tipo'] }}</strong>
            <div class="muted">
              {{ h['id'] }} · {{ h['estado'] || '—' }}
              @if (detalles(h)['registradoPor']) {
                · Registra: {{ detalles(h)['registradoPor'] }}
              }
            </div>
          </div>
          <div class="actions">
            @if (
              (h['tipo'] === 'VISITANTE' ||
                h['tipo'] === 'CONTRATISTA' ||
                h['tipo'] === 'DOMICILIARIO') &&
              (h['estado'] === 'ACTIVO' || h['estado'] === 'ENTREGANDO')
            ) {
              <button type="button" class="mini" (click)="doSalida(h)">Salida</button>
            }
            @if (h['tipo'] === 'CORRESPONDENCIA' && h['estado'] === 'PENDIENTE') {
              <button type="button" class="mini" (click)="doEntregar(h)">Entregar</button>
            }
          </div>
        </div>
      } @empty {
        <p class="muted">Sin historial.</p>
      }
    </section>
  `,
  styles: [MINUTA_PAGE_STYLES],
})
export class MinutaHistorial implements OnInit {
  private readonly api = inject(MinutaApiService);
  readonly historial = signal<Record<string, unknown>[]>([]);
  readonly msg = signal('');
  filtroTipo = 'TODOS';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.historial(50, this.filtroTipo).subscribe({
      next: (r) => this.historial.set((r.historial || []) as Record<string, unknown>[]),
      error: () => this.historial.set([]),
    });
  }

  detalles(h: Record<string, unknown>): Record<string, unknown> {
    return (h['detalles'] as Record<string, unknown>) || h;
  }

  doSalida(h: Record<string, unknown>): void {
    this.api.salida(String(h['id']), String(h['tipo'])).subscribe({
      next: () => {
        this.msg.set('Salida registrada');
        this.load();
      },
      error: (e) => this.msg.set(e?.error?.message || 'Error en salida'),
    });
  }

  doEntregar(h: Record<string, unknown>): void {
    const recibidoPor = prompt('¿Quién recibe el paquete?', 'Residente');
    if (!recibidoPor || recibidoPor.trim().length < 2) return;
    this.api.entregarCorr(String(h['id']), recibidoPor.trim()).subscribe({
      next: () => {
        this.msg.set('Correspondencia entregada');
        this.load();
      },
      error: (e) => this.msg.set(e?.error?.message || 'Error al entregar'),
    });
  }
}
