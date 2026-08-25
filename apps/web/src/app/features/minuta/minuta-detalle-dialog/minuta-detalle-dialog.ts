import { Component, input, output } from '@angular/core';

const FIELD_LABELS: Record<string, string> = {
  id: 'ID',
  tipo: 'Tipo',
  estado: 'Estado',
  registradoPor: 'Vigilante que registra',
  fechaRegistro: 'Fecha registro',
  nombreCompleto: 'Nombre',
  cedula: 'Cédula',
  aptoNo: 'Apto / unidad',
  acompana: 'Acompaña',
  vehiculoPlaca: 'Placa',
  horaEntrada: 'Hora entrada',
  horaSalida: 'Hora salida',
  observaciones: 'Observaciones',
  clase: 'Clase',
  destinatario: 'Destinatario',
  remitente: 'Remitente',
  recibidoPor: 'Recibido por',
  horaEntrega: 'Hora entrega',
  empresa: 'Empresa',
  areaTrabajo: 'Área de trabajo',
  autorizadoPor: 'Autorizado por',
  tipoPedido: 'Tipo de pedido',
  nombreDomiciliario: 'Domiciliario',
  placaMoto: 'Placa moto',
  gravedad: 'Gravedad',
  ubicacion: 'Ubicación',
  descripcion: 'Descripción',
  anotaciones: 'Anotaciones',
  novedades: 'Novedades',
  turnoSaliente: 'Turno saliente',
  turnoEntrante: 'Turno entrante',
  vigilanteSaliente: 'Vigilante saliente',
  vigilanteEntrante: 'Vigilante entrante',
  nombreDelPuesto: 'Nombre del puesto',
  resumen: 'Resumen',
};

@Component({
  selector: 'app-minuta-detalle-dialog',
  template: `
    @if (open()) {
      <div class="backdrop" (click)="closed.emit()" role="presentation">
        <div
          class="panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="minuta-det-title"
          (click)="$event.stopPropagation()"
        >
          <header class="panel-head">
            <div>
              <h3 id="minuta-det-title">{{ title() }}</h3>
              @if (subtitle()) {
                <p class="sub">{{ subtitle() }}</p>
              }
            </div>
            <button type="button" class="close" (click)="closed.emit()" aria-label="Cerrar">
              ×
            </button>
          </header>
          <div class="panel-body">
            @for (row of rows(); track row.key) {
              <div class="field">
                <span class="label">{{ row.label }}</span>
                <span class="value">{{ row.value }}</span>
              </div>
            } @empty {
              <p class="empty">Sin detalle disponible.</p>
            }
          </div>
          <footer class="panel-foot">
            <button type="button" class="btn" (click)="closed.emit()">Cerrar</button>
          </footer>
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop {
      position: fixed; inset: 0; z-index: 80;
      background: rgba(15, 23, 42, 0.5);
      display: grid; place-items: end center;
      padding: 0;
    }
    @media (min-width: 640px) {
      .backdrop { place-items: center; padding: 1rem; }
    }
    .panel {
      width: min(100%, 440px);
      max-height: 92dvh;
      overflow: auto;
      background: var(--surface, #fff);
      border-radius: 16px 16px 0 0;
      display: flex; flex-direction: column;
      box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
    }
    @media (min-width: 640px) {
      .panel { border-radius: 14px; }
    }
    .panel-head {
      display: flex; justify-content: space-between; gap: 0.75rem;
      padding: 1rem 1rem 0.75rem; border-bottom: 1px solid var(--border, #e2e8f0);
    }
    .panel-head h3 { margin: 0; font-size: 1.05rem; color: #1e3a8a; }
    .sub { margin: 0.25rem 0 0; font-size: 0.8rem; color: var(--text-muted, #64748b); }
    .close {
      border: 0; background: transparent; font-size: 1.5rem; line-height: 1;
      cursor: pointer; color: var(--text-muted, #64748b); padding: 0 0.25rem;
    }
    .panel-body {
      padding: 0.75rem 1rem; display: flex; flex-direction: column; gap: 0.65rem;
    }
    .field {
      display: grid; gap: 0.15rem;
      padding-bottom: 0.55rem;
      border-bottom: 1px solid var(--border, #f1f5f9);
    }
    .label {
      font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.04em; color: var(--text-muted, #64748b);
    }
    .value {
      font-size: 0.95rem; color: var(--text-primary, #0f172a);
      white-space: pre-wrap; word-break: break-word;
    }
    .empty { margin: 0; color: var(--text-muted, #64748b); }
    .panel-foot {
      padding: 0.75rem 1rem calc(0.85rem + env(safe-area-inset-bottom, 0px));
      border-top: 1px solid var(--border, #e2e8f0);
    }
    .btn {
      width: 100%; border: 0; border-radius: 10px; padding: 0.7rem 1rem;
      background: #1e3a8a; color: #fff; font-weight: 700; cursor: pointer;
    }
  `,
})
export class MinutaDetalleDialog {
  readonly open = input(false);
  readonly title = input('Detalle de novedad');
  readonly subtitle = input<string | null>(null);
  readonly fields = input<Record<string, unknown>>({});
  readonly closed = output<void>();

  rows(): Array<{ key: string; label: string; value: string }> {
    const entries = Object.entries(this.fields() || {});
    const preferred = [
      'registradoPor',
      'estado',
      'fechaRegistro',
      'nombreCompleto',
      'cedula',
      'aptoNo',
      'clase',
      'destinatario',
      'remitente',
      'empresa',
      'areaTrabajo',
      'autorizadoPor',
      'tipoPedido',
      'nombreDomiciliario',
      'placaMoto',
      'acompana',
      'vehiculoPlaca',
      'horaEntrada',
      'horaSalida',
      'recibidoPor',
      'horaEntrega',
      'tipo',
      'gravedad',
      'ubicacion',
      'descripcion',
      'anotaciones',
      'novedades',
      'turnoSaliente',
      'turnoEntrante',
      'vigilanteSaliente',
      'vigilanteEntrante',
      'nombreDelPuesto',
      'observaciones',
      'resumen',
      'id',
    ];
    const ordered: Array<[string, unknown]> = [];
    const seen = new Set<string>();
    for (const k of preferred) {
      const hit = entries.find(([ek]) => ek === k);
      if (hit) {
        ordered.push(hit);
        seen.add(k);
      }
    }
    for (const e of entries) {
      if (!seen.has(e[0])) ordered.push(e);
    }
    return ordered.map(([key, raw]) => ({
      key,
      label: FIELD_LABELS[key] || key,
      value: this.formatValue(raw),
    }));
  }

  private formatValue(raw: unknown): string {
    if (raw === null || raw === undefined || raw === '') return '—';
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(raw)) {
      try {
        const d = new Date(raw);
        if (!Number.isNaN(d.getTime())) {
          return d.toLocaleString('es-CO', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      } catch {
        /* keep raw */
      }
    }
    return String(raw);
  }
}
