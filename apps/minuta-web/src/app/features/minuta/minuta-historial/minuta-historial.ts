import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MinutaApiService } from '../minuta-api.service';
import { MinutaDetalleDialog } from '../minuta-detalle-dialog/minuta-detalle-dialog';
import { MINUTA_PAGE_STYLES, labelForMinutaTipo } from '../minuta.shared';

@Component({
  selector: 'app-minuta-historial',
  imports: [FormsModule, MinutaDetalleDialog],
  template: `
    <section class="page">
      <div>
        <h2>Historial</h2>
        <p class="hint">Lo que ya registraste en el puesto. Usa Ver para el detalle.</p>
      </div>
      @if (msg()) {
        <p class="toast">{{ msg() }}</p>
      }
      <label class="filt">
        Filtrar por tipo
        <select [(ngModel)]="filtroTipo" name="ft" (change)="load()">
          <option value="TODOS">Todos</option>
          <option value="VISITANTE">Visitante</option>
          <option value="CORRESPONDENCIA">Correspondencia</option>
          <option value="CONTRATISTA">Contratista</option>
          <option value="DOMICILIARIO">Domicilio</option>
          <option value="INCIDENTE">Incidente</option>
          <option value="SERVICIO">Servicio</option>
          <option value="ENTREGA">Entrega de puesto</option>
        </select>
      </label>
      @for (h of historial(); track h['id']) {
        <div class="card row">
          <div class="card-main">
            <strong>{{ tipoLabel(h['tipo']) }}</strong>
            <div class="muted">
              {{ estadoLabel(h['estado']) }}
              @if (detalles(h)['registradoPor']) {
                · {{ detalles(h)['registradoPor'] }}
              }
              @if (resumen(h)) {
                · {{ resumen(h) }}
              }
            </div>
          </div>
          <div class="actions">
            <button type="button" class="mini" (click)="openDetalle(h)">Ver</button>
            @if (
              (h['tipo'] === 'VISITANTE' ||
                h['tipo'] === 'CONTRATISTA' ||
                h['tipo'] === 'DOMICILIARIO') &&
              (h['estado'] === 'ACTIVO' || h['estado'] === 'ENTREGANDO')
            ) {
              <button type="button" class="mini accent" (click)="doSalida(h)">Marcar salida</button>
            }
            @if (h['tipo'] === 'CORRESPONDENCIA' && h['estado'] === 'PENDIENTE') {
              <button type="button" class="mini accent" (click)="doEntregar(h)">Entregar</button>
            }
          </div>
        </div>
      } @empty {
        <p class="muted">Sin registros aún. Ve a Registrar para crear el primero.</p>
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
    .mini.accent {
      background: #0c4a6e;
      color: #fff;
      border-color: #0c4a6e;
    }
  `,
  ],
})
export class MinutaHistorial implements OnInit {
  private readonly api = inject(MinutaApiService);
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

  tipoLabel(tipo: unknown): string {
    return labelForMinutaTipo(tipo);
  }

  estadoLabel(estado: unknown): string {
    const e = String(estado || '').toUpperCase();
    if (e === 'ACTIVO') return 'En el puesto';
    if (e === 'PENDIENTE') return 'Pendiente de entrega';
    if (e === 'ENTREGADO') return 'Entregado';
    if (e === 'SALIDA' || e === 'CERRADO') return 'Ya salió';
    if (e === 'ENTREGANDO') return 'En entrega';
    return e || '—';
  }

  resumen(h: Record<string, unknown>): string {
    const d = this.detalles(h);
    const bits = [d['nombre'], d['destinatario'], d['nombreDomiciliario'], d['apto'], d['empresa']]
      .map((x) => String(x || '').trim())
      .filter(Boolean);
    return bits.slice(0, 2).join(' · ');
  }

  detalles(h: Record<string, unknown>): Record<string, unknown> {
    return (h['detalles'] as Record<string, unknown>) || h;
  }

  openDetalle(h: Record<string, unknown>): void {
    this.detalle.set(h);
  }

  detalleTitle(): string {
    const h = this.detalle();
    return h ? labelForMinutaTipo(h['tipo']) : 'Detalle';
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
    return [this.estadoLabel(h['estado']), fechaTxt].filter(Boolean).join(' · ');
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
      error: (e) => this.msg.set(e?.error?.message || 'No se pudo marcar la salida'),
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
      error: (e) => this.msg.set(e?.error?.message || 'No se pudo entregar'),
    });
  }
}
