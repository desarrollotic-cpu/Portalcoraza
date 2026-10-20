import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AjusteCodigo,
  ConversionAdmonApiService,
  ConversionAdmonPreview,
  ModoCodigoDoble,
} from './conversion-admon-api.service';

const RE_PERIODO = /^(0[1-9]|1[0-2])$/;
const RE_FECHA = /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(\d{4})$/;

@Component({
  selector: 'app-conversion-admon',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="conv">
      <div class="head">
        <h3>Conversión de nómina de administrativos</h3>
        <p class="subtitle">
          Sube el archivo de compensación administrativa (.xlsx) y descarga el plano listo para
          cargar al programa de nómina. Los valores se copian tal como vienen: no se validan ni se
          recalculan.
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
          <span>{{ f.size / 1024 | number: '1.0-0' }} KB · haz clic o arrastra otro para cambiarlo</span>
        } @else {
          <strong>Arrastra aquí la compensación administrativa</strong>
          <span>o haz clic para seleccionarla (.xlsx, máximo 10 MB)</span>
        }
      </label>

      @if (cargando()) {
        <p class="info">Leyendo el archivo…</p>
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }

      @if (preview(); as p) {
        <section class="card">
          <h4>Quincena</h4>
          <div class="fields">
            <div class="field">
              <label for="hoja">Hoja del libro</label>
              <select id="hoja" [ngModel]="hoja()" (ngModelChange)="cambiarHoja($event)">
                @for (h of p.hojas; track h) {
                  <option [value]="h">{{ h }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label for="periodo">Período (mes)</label>
              <input id="periodo" [ngModel]="periodo()" (ngModelChange)="periodo.set($event)" placeholder="09" />
            </div>
            <div class="field">
              <label for="fecha">Fecha (MM/DD/AAAA)</label>
              <input id="fecha" [ngModel]="fecha()" (ngModelChange)="fecha.set($event)" placeholder="09/30/2026" />
            </div>
            <div class="field kpi">
              <span>Empleados</span>
              <strong>{{ p.empleados }}</strong>
            </div>
            <div class="field kpi">
              <span>Líneas</span>
              <strong>{{ p.totalFilas }}</strong>
            </div>
          </div>
          @if (!valido()) {
            <p class="error">Revisa el período y la fecha antes de descargar.</p>
          }
        </section>

        <section class="card">
          <h4>Conceptos con dos códigos</h4>
          <div class="fields">
            <div class="field">
              <label for="modo">Cómo se escriben</label>
              <select id="modo" [ngModel]="modo()" (ngModelChange)="cambiarModo($event)">
                <option value="combinado">Los dos juntos (030-031)</option>
                <option value="habitual">Un solo código, elegido aquí</option>
              </select>
            </div>
          </div>
          <p class="nota">
            La hoja no dice cuál de los dos códigos va en cada caso: eso se decidía a mano, sabiendo
            cosas que el archivo no trae. Con «los dos juntos» no hay que decidir nada; con «un solo
            código» se marca abajo cuáles van al alterno.
          </p>

          @if (modo() === 'habitual' && p.dobleCodigo.length) {
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Cédula</th>
                    <th>Nombre</th>
                    <th>Concepto</th>
                    <th class="num">Valor</th>
                    <th>Código</th>
                  </tr>
                </thead>
                <tbody>
                  @for (d of p.dobleCodigo; track d.cedula + d.codigoAsignado) {
                    <tr>
                      <td>{{ d.cedula }}</td>
                      <td>{{ d.nombre }}</td>
                      <td>{{ d.encabezado }}</td>
                      <td class="num">{{ fmt(d.valor) }}</td>
                      <td>
                        <select
                          [ngModel]="codigoDe(d.cedula, d.codigoAsignado, d.codigoAlterno)"
                          (ngModelChange)="elegirCodigo(d.cedula, d.codigoAsignado, d.codigoAlterno, $event)"
                        >
                          <option [value]="d.codigoAsignado">{{ d.codigoAsignado }}</option>
                          <option [value]="d.codigoAlterno">{{ d.codigoAlterno }}</option>
                        </select>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        @if (p.advertencias.length) {
          <section class="card warn">
            <h4>Revisa antes de cargar</h4>
            <ul>
              @for (a of p.advertencias; track a) {
                <li>{{ a }}</li>
              }
            </ul>
          </section>
        }

        <section class="card">
          <h4>Totales por concepto</h4>
          <p class="nota">Cuádralos contra el GRAN TOTAL de la hoja antes de descargar.</p>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th class="num">Líneas</th>
                  <th class="num">Suma</th>
                </tr>
              </thead>
              <tbody>
                @for (t of p.totales; track t.codigo) {
                  <tr>
                    <td><code>{{ t.codigo }}</code></td>
                    <td class="num">{{ t.filas }}</td>
                    <td class="num">{{ fmt(t.suma) }}</td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td class="num">{{ p.totalFilas }}</td>
                  <td class="num">{{ fmt(sumaTotal()) }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <div class="actions">
          <button class="btn" [disabled]="!valido() || descargando()" (click)="descargar()">
            {{ descargando() ? 'Generando…' : 'Descargar archivo plano' }}
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .conv { display: flex; flex-direction: column; gap: 1rem; }
      .head h3 { margin: 0 0 0.25rem; }
      .subtitle { margin: 0; font-size: 0.9rem; color: var(--neutral-600); max-width: 60rem; }
      .drop {
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.3rem;
        padding: 2rem; border: 2px dashed var(--neutral-300); border-radius: 0.6rem;
        background: var(--neutral-50); cursor: pointer; text-align: center;
      }
      .drop.over { border-color: #1d4ed8; background: color-mix(in srgb, #0043eb 8%, var(--surface)); }
      .drop span { font-size: 0.84rem; color: var(--neutral-600); }
      .info { margin: 0; font-size: 0.9rem; color: var(--neutral-600); }
      .error { margin: 0; font-size: 0.9rem; color: var(--danger-text, #b91c1c); font-weight: 600; }
      .card {
        background: var(--surface); border: 1px solid var(--neutral-200);
        border-radius: 0.6rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;
      }
      .card h4 { margin: 0; font-size: 0.95rem; }
      .card.warn { background: color-mix(in srgb, var(--warning-500) 12%, var(--surface)); border-color: #fcd34d; }
      .card.warn ul { margin: 0; padding-left: 1.1rem; font-size: 0.84rem; color: var(--warning-text); }
      .nota { margin: 0; font-size: 0.84rem; color: var(--neutral-600); max-width: 60rem; }
      .fields { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; }
      .field { display: flex; flex-direction: column; gap: 0.3rem; }
      .field label { font-size: 0.8rem; font-weight: 700; color: var(--neutral-700); }
      .field input, .field select {
        padding: 0.5rem 0.75rem; border: 1px solid var(--neutral-300);
        border-radius: 0.4rem; font-size: 0.95rem; min-width: 10.5rem;
      }
      .field input:focus, .field select:focus { outline: 2px solid #1d4ed8; border-color: #1d4ed8; }
      .kpi span { font-size: 0.8rem; font-weight: 700; color: var(--neutral-700); }
      .kpi strong { font-size: 1.35rem; color: #1d4ed8; }
      .table-wrap { overflow-x: auto; }
      .data-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
      .data-table th { background: var(--neutral-50); padding: 0.55rem 0.85rem; border-bottom: 1px solid var(--neutral-300); text-align: left; font-weight: 700; color: var(--neutral-600); font-size: 0.8rem; }
      .data-table td { padding: 0.5rem 0.85rem; border-bottom: 1px solid var(--neutral-200); }
      .data-table tfoot td { font-weight: 700; border-bottom: none; }
      .data-table .num { text-align: right; font-variant-numeric: tabular-nums; }
      .data-table code { background: var(--neutral-100); padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 700; }
      .data-table select { padding: 0.3rem 0.5rem; border: 1px solid var(--neutral-300); border-radius: 0.35rem; }
      .actions { display: flex; flex-wrap: wrap; gap: 0.75rem; }
      .btn {
        background: #1d4ed8; color: #fff; border: 1px solid #1d4ed8; padding: 0.6rem 1.3rem;
        border-radius: 0.5rem; font-size: 0.92rem; font-weight: 700; cursor: pointer;
      }
      .btn:hover:not(:disabled) { background: #1e40af; }
      .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    `,
  ],
})
export class ConversionAdmonComponent {
  private api = inject(ConversionAdmonApiService);

  archivo = signal<File | null>(null);
  preview = signal<ConversionAdmonPreview | null>(null);
  cargando = signal(false);
  descargando = signal(false);
  error = signal('');
  arrastrando = signal(false);

  hoja = signal('');
  modo = signal<ModoCodigoDoble>('combinado');
  periodo = signal('');
  fecha = signal('');

  /** Reasignaciones elegidas a mano, solo en modo «habitual». */
  private ajustes = signal<AjusteCodigo[]>([]);

  valido = computed(
    () => RE_PERIODO.test(this.periodo().trim()) && RE_FECHA.test(this.fecha().trim()),
  );

  sumaTotal = computed(() =>
    (this.preview()?.totales ?? []).reduce((s, t) => s + t.suma, 0),
  );

  fmt(n: number): string {
    return n.toLocaleString('es-CO', { maximumFractionDigits: 0 });
  }

  codigoDe(cedula: string, asignado: string, alterno: string): string {
    return this.ajustes().some((x) => x.cedula === cedula && x.de === asignado) ? alterno : asignado;
  }

  elegirCodigo(cedula: string, asignado: string, alterno: string, elegido: string) {
    const resto = this.ajustes().filter((x) => !(x.cedula === cedula && x.de === asignado));
    this.ajustes.set(
      elegido === alterno ? [...resto, { cedula, de: asignado, a: alterno }] : resto,
    );
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

  cambiarHoja(h: string) {
    this.hoja.set(h);
    this.releer();
  }

  cambiarModo(m: ModoCodigoDoble) {
    this.modo.set(m);
    this.ajustes.set([]); // las reasignaciones no aplican al otro modo
    this.releer();
  }

  private cargar(f: File) {
    this.error.set('');
    this.preview.set(null);
    this.ajustes.set([]);
    this.hoja.set('');
    if (!/\.xlsx$/i.test(f.name)) {
      this.archivo.set(null);
      this.error.set('El archivo debe ser un Excel .xlsx.');
      return;
    }
    this.archivo.set(f);
    this.releer();
  }

  private releer() {
    const f = this.archivo();
    if (!f) return;
    this.cargando.set(true);
    this.error.set('');
    this.api.previsualizar(f, this.hoja() || undefined, this.modo()).subscribe({
      next: (p) => {
        this.cargando.set(false);
        this.preview.set(p);
        this.hoja.set(p.hojaUsada);
        this.periodo.set(p.periodo.periodo ?? '');
        this.fecha.set(p.periodo.fecha ?? '');
      },
      error: async (e) => {
        this.cargando.set(false);
        this.preview.set(null);
        this.error.set(await this.api.mensajeError(e));
      },
    });
  }

  descargar() {
    const f = this.archivo();
    if (!f || !this.valido()) return;
    this.descargando.set(true);
    this.error.set('');
    this.api
      .descargar(f, {
        hoja: this.hoja() || undefined,
        modo: this.modo(),
        periodo: this.periodo().trim(),
        fecha: this.fecha().trim(),
        ajustes: this.ajustes(),
      })
      .subscribe({
        next: (blob) => {
          this.descargando.set(false);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = this.nombreSugerido();
          a.click();
          URL.revokeObjectURL(url);
        },
        error: async (e) => {
          this.descargando.set(false);
          this.error.set(await this.api.mensajeError(e));
        },
      });
  }

  private nombreSugerido(): string {
    const p = this.preview()?.periodo;
    const q = p?.quincena === 'Primera' ? '1Q' : '2Q';
    return `${q}_${this.hoja().replace(/[^A-Za-zÁÉÍÓÚÑ]/gi, '') || 'ADMON'}.xlsx`;
  }
}
