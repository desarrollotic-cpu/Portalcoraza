import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideEye } from '@lucide/angular';
import { Icon } from '../../../shared/components/icon/icon';
import { MinutaApiService } from '../minuta-api.service';
import { MinutaDetalleDialog } from '../minuta-detalle-dialog/minuta-detalle-dialog';
import { MINUTA_PAGE_STYLES } from '../minuta.shared';

@Component({
  selector: 'app-minuta-historial',
  imports: [FormsModule, MinutaDetalleDialog, Icon],
  template: `
    <section class="page">
      <div>
        <h2>Historial del puesto</h2>
        <p class="hint">
          Consulta de novedades de tu puesto. Usa el ojo para ver el detalle completo.
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
          <div class="card-main">
            <strong>{{ h['tipo'] }}</strong>
            <div class="muted">
              {{ h['id'] }} · {{ h['estado'] || '—' }}
              @if (detalles(h)['registradoPor']) {
                · Registra: {{ detalles(h)['registradoPor'] }}
              }
            </div>
          </div>
          <div class="actions">
            <button
              type="button"
              class="mini eye"
              (click)="openDetalle(h)"
              title="Ver detalle"
              aria-label="Ver detalle"
            >
              <app-icon [icon]="icons.Eye" [size]="16" [strokeWidth]="2" />
            </button>
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

    <app-minuta-detalle-dialog
      [open]="!!detalle()"
      [title]="detalleTitle()"
      [subtitle]="detalleSubtitle()"
      [fields]="detalleFields()"
      (closed)="detalle.set(null)"
    />
  `,
  styles: [
    MINUTA_PAGE_STYLES,
    `
    .card-main { min-width: 0; flex: 1; }
    .mini.eye {
      display: inline-flex; align-items: center; justify-content: center;
      width: 2.1rem; height: 2.1rem; padding: 0;
    }
  `,
  ],
})
export class MinutaHistorial implements OnInit {
  private readonly api = inject(MinutaApiService);
  readonly icons = { Eye: LucideEye };
  readonly historial = signal<Record<string, unknown>[]>([]);
  readonly msg = signal('');
  readonly detalle = signal<Record<string, unknown> | null>(null);
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

  openDetalle(h: Record<string, unknown>): void {
    this.detalle.set(h);
  }

  detalleTitle(): string {
    const h = this.detalle();
    return h ? `Detalle · ${String(h['tipo'] || 'Novedad')}` : 'Detalle';
  }

  detalleSubtitle(): string | null {
    const h = this.detalle();
    if (!h) return null;
    const fecha = h['fecha'];
    const when =
      typeof fecha === 'string' || fecha instanceof Date
        ? new Date(fecha as string | Date)
        : null;
    const fechaTxt =
      when && !Number.isNaN(when.getTime())
        ? when.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
        : null;
    return [h['id'], h['estado'], fechaTxt].filter(Boolean).join(' · ');
  }

  detalleFields(): Record<string, unknown> {
    const h = this.detalle();
    if (!h) return {};
    const d = { ...this.detalles(h) };
    delete d['id'];
    delete d['tipo'];
    return d;
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
