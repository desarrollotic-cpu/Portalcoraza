import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ConversionPreview, PayrollConversionApiService } from './payroll-conversion-api.service';

const MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];
const RE_PERIODO = /^(0[1-9]|1[0-2])$/;
const RE_FECHA = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(\d{4})$/;

@Component({
  selector: 'app-payroll-conversion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="conv">
      <div class="head">
        <h3>Conversión de nómina</h3>
        <p class="subtitle">
          Sube el consolidado de la quincena (.xlsx) y descarga el BASE listo para cargar al programa de nómina.
          Los valores se copian tal como vienen en el consolidado: no se validan ni se recalculan.
        </p>
      </div>

      <label
        class="drop"
        [class.over]="arrastrando()"
        (dragover)="$event.preventDefault(); arrastrando.set(true)"
        (dragleave)="arrastrando.set(false)"
        (drop)="soltar($event)"
      >
        <input type="file" accept=".xlsx" (change)="elegir($event)" hidden />
        @if (archivo(); as f) {
          <strong>{{ f.name }}</strong>
          <span>{{ (f.size / 1024) | number: '1.0-0' }} KB · haz clic o arrastra otro archivo para cambiarlo</span>
        } @else {
          <strong>Arrastra el consolidado aquí</strong>
          <span>o haz clic para seleccionarlo (.xlsx, máximo 10 MB)</span>
        }
      </label>

      @if (cargando()) {
        <p class="info">Leyendo el consolidado…</p>
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      @if (preview(); as p) {
        <section class="card">
          <h4>Período y fecha detectados</h4>
          <div class="fields">
            <div class="field">
              <label for="conv-periodo">Período (mes, 2 dígitos)</label>
              <input id="conv-periodo" [ngModel]="periodo()" (ngModelChange)="periodo.set($event)" maxlength="2" placeholder="09" />
            </div>
            <div class="field">
              <label for="conv-fecha">Fecha (MM/DD/AAAA)</label>
              <input id="conv-fecha" [ngModel]="fecha()" (ngModelChange)="fecha.set($event)" maxlength="10" placeholder="09/30/2026" />
            </div>
            <div class="field kpi">
              <span>Filas a generar</span>
              <strong>{{ fmt(p.totalFilas) }}</strong>
            </div>
          </div>
          @if (!valido()) {
            <p class="error">Revisa el período (01 a 12) y la fecha (MM/DD/AAAA) antes de descargar.</p>
          }
        </section>

        <section class="card">
          <h4>Zonas detectadas ({{ p.zonas.length }})</h4>
          <div class="chips">
            @for (z of p.zonas; track z.nombre) {
              <span class="chip">{{ z.nombre }} · {{ z.asociados }} asociados</span>
            }
          </div>
        </section>

        @if (p.advertencias.length) {
          <section class="card warn">
            <h4>Avisos</h4>
            <ul>
              @for (w of p.advertencias; track w) {
                <li>{{ w }}</li>
              }
            </ul>
          </section>
        }

        <section class="card">
          <h4>Totales por concepto</h4>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th>Código</th><th class="num">Filas</th><th class="num">Suma del valor</th></tr>
              </thead>
              <tbody>
                @for (t of p.totales; track t.codigo) {
                  <tr>
                    <td><code>{{ t.codigo }}</code></td>
                    <td class="num">{{ fmt(t.filas) }}</td>
                    <td class="num">{{ fmt(t.suma, t.codigo === '011' ? 2 : 0) }}</td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr><td>Total filas</td><td class="num">{{ fmt(p.totalFilas) }}</td><td></td></tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section class="card manual">
          <h4>Para cargar a mano</h4>
          <p>
            <strong>{{ p.bonificaciones.length }}</strong> asociados con bonificación (total
            <strong>{{ fmt(p.totalBonificaciones) }}</strong>) e
            <strong>{{ p.incapacitados.length }}</strong> incapacitados. No van en el BASE; el detalle está en el resumen.
          </p>
        </section>

        <div class="actions">
          <button class="btn" type="button" [disabled]="!valido() || descargando() !== null" (click)="descargar('base')">
            {{ descargando() === 'base' ? 'Generando…' : 'Descargar BASE' }}
          </button>
          <button class="btn secondary" type="button" [disabled]="!valido() || descargando() !== null" (click)="descargar('resumen')">
            {{ descargando() === 'resumen' ? 'Generando…' : 'Descargar resumen' }}
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .conv { display: flex; flex-direction: column; gap: 1.1rem; max-width: 980px; }
    .head h3 { margin: 0 0 0.2rem; font-size: 1.1rem; font-weight: 700; color: #0f172a; }
    .subtitle { margin: 0; color: #64748b; font-size: 0.85rem; }
    .drop {
      display: flex; flex-direction: column; align-items: center; gap: 0.3rem; text-align: center;
      padding: 1.6rem 1rem; border: 2px dashed #93a8e6; border-radius: 0.75rem; background: #f5f8ff;
      color: #1e3a8a; cursor: pointer; transition: all 0.15s;
    }
    .drop span { font-size: 0.82rem; color: #475569; }
    .drop:hover, .drop.over { border-color: #1d4ed8; background: #eaf0ff; }
    .info { margin: 0; color: #1d4ed8; font-size: 0.88rem; font-weight: 600; }
    .error { margin: 0; color: #b91c1c; font-size: 0.88rem; font-weight: 600; }
    .card { padding: 1.1rem 1.25rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 0.75rem; display: flex; flex-direction: column; gap: 0.7rem; }
    .card h4 { margin: 0; font-size: 0.95rem; font-weight: 700; color: #0f172a; }
    .card.warn { background: #fffbeb; border-color: #fcd34d; }
    .card.warn ul { margin: 0; padding-left: 1.1rem; font-size: 0.84rem; color: #92400e; }
    .card.manual p { margin: 0; font-size: 0.9rem; color: #334155; }
    .fields { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; }
    .field { display: flex; flex-direction: column; gap: 0.3rem; }
    .field label { font-size: 0.8rem; font-weight: 700; color: #334155; }
    .field input { padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.4rem; font-size: 0.95rem; width: 10.5rem; }
    .field input:focus { outline: 2px solid #1d4ed8; border-color: #1d4ed8; }
    .kpi span { font-size: 0.8rem; font-weight: 700; color: #334155; }
    .kpi strong { font-size: 1.35rem; color: #1d4ed8; }
    .chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
    .chip { background: #eaf0ff; color: #1e3a8a; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 999px; }
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    .data-table th { background: #f8fafc; padding: 0.55rem 0.85rem; border-bottom: 1px solid #cbd5e1; text-align: left; font-weight: 700; color: #475569; font-size: 0.8rem; }
    .data-table td { padding: 0.5rem 0.85rem; border-bottom: 1px solid #e2e8f0; }
    .data-table tfoot td { font-weight: 700; border-bottom: none; }
    .data-table .num { text-align: right; font-variant-numeric: tabular-nums; }
    .data-table code { background: #f1f5f9; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 700; color: #0f172a; }
    .actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
    .btn {
      background: #1d4ed8; color: #fff; border: 1px solid #1d4ed8; padding: 0.6rem 1.3rem; border-radius: 0.5rem;
      font-size: 0.92rem; font-weight: 700; cursor: pointer; transition: background 0.15s;
    }
    .btn:hover:not(:disabled) { background: #1e40af; }
    .btn.secondary { background: #fff; color: #1d4ed8; }
    .btn.secondary:hover:not(:disabled) { background: #eaf0ff; }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
  `],
})
export class PayrollConversionComponent {
  private api = inject(PayrollConversionApiService);

  archivo = signal<File | null>(null);
  preview = signal<ConversionPreview | null>(null);
  cargando = signal(false);
  error = signal('');
  arrastrando = signal(false);
  descargando = signal<'base' | 'resumen' | null>(null);

  periodo = signal('');
  fecha = signal('');

  valido = computed(() => RE_PERIODO.test(this.periodo().trim()) && RE_FECHA.test(this.fecha().trim()));

  fmt(n: number, dec = 0): string {
    return n.toLocaleString('es-CO', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  elegir(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = ''; // permite volver a elegir el mismo archivo
    if (f) this.cargar(f);
  }

  soltar(ev: DragEvent) {
    ev.preventDefault();
    this.arrastrando.set(false);
    const f = ev.dataTransfer?.files?.[0];
    if (f) this.cargar(f);
  }

  private cargar(f: File) {
    this.error.set('');
    this.preview.set(null);
    if (!/\.xlsx$/i.test(f.name)) {
      this.archivo.set(null);
      this.error.set('El archivo debe ser un Excel .xlsx.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      this.archivo.set(null);
      this.error.set('El archivo supera el tamaño máximo de 10 MB.');
      return;
    }
    this.archivo.set(f);
    this.cargando.set(true);
    this.api.previsualizar(f).subscribe({
      next: (p) => {
        this.preview.set(p);
        this.periodo.set(p.periodo.periodo ?? '');
        this.fecha.set(p.periodo.fecha ?? '');
        this.cargando.set(false);
      },
      error: async (e) => {
        this.error.set(await this.api.mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  descargar(tipo: 'base' | 'resumen') {
    const f = this.archivo();
    if (!f || !this.valido()) return;
    this.error.set('');
    this.descargando.set(tipo);
    const periodo = this.periodo().trim();
    const fecha = this.fecha().trim();
    const req = tipo === 'base' ? this.api.descargarBase(f, periodo, fecha) : this.api.descargarResumen(f, periodo, fecha);
    req.subscribe({
      next: (blob) => {
        this.guardar(blob, this.nombre(tipo, periodo, fecha));
        this.descargando.set(null);
      },
      error: async (e) => {
        this.error.set(await this.api.mensajeError(e));
        this.descargando.set(null);
      },
    });
  }

  /** Mismo nombre que arma el servidor: BASE_2Q_SEPTIEMBRE_2026.xlsx / RESUMEN_… */
  private nombre(tipo: 'base' | 'resumen', periodo: string, fecha: string): string {
    const m = RE_FECHA.exec(fecha) as RegExpExecArray;
    const q = parseInt(m[2], 10) <= 15 ? '1Q' : '2Q';
    return `${tipo === 'base' ? 'BASE' : 'RESUMEN'}_${q}_${MESES[parseInt(periodo, 10) - 1]}_${m[3]}.xlsx`;
  }

  private guardar(blob: Blob, nombre: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }
}
