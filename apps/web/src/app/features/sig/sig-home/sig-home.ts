import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  SigApiService,
  SigDashboard,
  SigIndicador,
  SigObjetivo,
  SigResultado,
} from '../sig-api.service';

type Tab = 'dashboard' | 'mapa' | 'catalogo' | 'captura';

@Component({
  selector: 'app-sig-home',
  imports: [FormsModule],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>SIG-KPI</h2>
          <p>Sistema de gestión de indicadores · CMI Coraza</p>
        </div>
        <nav class="tabs">
          @for (t of tabs; track t.id) {
            <button type="button" [class.on]="tab() === t.id" (click)="go(t.id)">{{ t.label }}</button>
          }
        </nav>
      </header>

      @if (msg()) {
        <p class="toast">{{ msg() }}</p>
      }

      @if (tab() === 'dashboard') {
        <div class="toolbar">
          <label>Área
            <select [(ngModel)]="area" name="area" (change)="loadDash()">
              <option value="">Todas</option>
              <option value="GH">Gestión Humana</option>
              <option value="SST">SST</option>
              <option value="COMERCIAL">Comercial</option>
              <option value="OPERACIONES">Operaciones</option>
              <option value="ADMIN">Administrativo</option>
            </select>
          </label>
          <label>Año
            <input type="number" [(ngModel)]="anio" name="anio" (change)="loadDash()" />
          </label>
        </div>
        <div class="kpis">
          <article class="azul"><small>Azul</small><b>{{ dash()?.counts?.AZUL || 0 }}</b></article>
          <article class="verde"><small>Verde</small><b>{{ dash()?.counts?.VERDE || 0 }}</b></article>
          <article class="amarillo"><small>Amarillo</small><b>{{ dash()?.counts?.AMARILLO || 0 }}</b></article>
          <article class="rojo"><small>Rojo</small><b>{{ dash()?.counts?.ROJO || 0 }}</b></article>
          <article><small>Sin dato</small><b>{{ dash()?.counts?.SIN_DATO || 0 }}</b></article>
        </div>
        <div class="cards">
          @for (it of dash()?.items || []; track it.id) {
            <article class="card" [attr.data-c]="it.color || 'NA'">
              <div class="row">
                <strong>{{ it.codigo }}</strong>
                <span class="dot" [attr.data-c]="it.color || 'NA'">{{ it.color || 'SIN DATO' }}</span>
              </div>
              <p>{{ it.nombre }}</p>
              <small>{{ it.area }} · {{ it.periodo || '—' }} · meta {{ it.meta ?? '—' }} / res {{ it.resultado ?? '—' }}</small>
              <button type="button" class="link" (click)="openCaptura(it.id)">Capturar</button>
            </article>
          }
        </div>
      }

      @if (tab() === 'mapa') {
        <div class="mapa">
          @for (p of perspectivas; track p) {
            <section>
              <h3>{{ p }}</h3>
              @for (o of objetivosBy(p); track o.id) {
                <button type="button" class="obj" (click)="fromMapa(o.id)">
                  <strong>{{ o.objetivoTexto }}</strong>
                  <span>{{ o.sistema }} · {{ o.indicadoresCount }} indicadores</span>
                </button>
              }
            </section>
          }
        </div>
      }

      @if (tab() === 'catalogo') {
        <div class="toolbar">
          <label>Área
            <select [(ngModel)]="filtroArea" name="fa" (change)="loadCatalogo()">
              <option value="">Todas</option>
              <option value="GH">GH</option>
              <option value="SST">SST</option>
              <option value="COMERCIAL">Comercial</option>
              <option value="OPERACIONES">Operaciones</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <label>Buscar
            <input [(ngModel)]="q" name="q" placeholder="código o nombre" (keyup)="noop()" />
          </label>
        </div>
        <table>
          <thead>
            <tr>
              <th>Cód</th><th>Indicador</th><th>Área</th><th>Freq</th><th>Sentido</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (i of catalogoFiltrado(); track i.id) {
              <tr>
                <td>{{ i.codigo }}</td>
                <td>{{ i.nombre }}</td>
                <td>{{ i.area }}</td>
                <td>{{ i.frecuencia }}</td>
                <td>{{ i.sentido }}</td>
                <td>{{ i.activo ? 'Activo' : 'Inactivo' }}</td>
                <td>
                  <button type="button" class="mini" (click)="openCaptura(i.id)">Capturar</button>
                  <button type="button" class="mini" (click)="toggleActivo(i)">{{ i.activo ? 'Baja' : 'Alta' }}</button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }

      @if (tab() === 'captura') {
        <div class="form">
          <label>Indicador
            <select [(ngModel)]="capturaId" name="cid" (change)="onIndicador()">
              <option value="">Seleccione</option>
              @for (i of catalogo(); track i.id) {
                <option [value]="i.id">{{ i.codigo }} — {{ i.nombre }}</option>
              }
            </select>
          </label>
          @if (sel(); as s) {
            <p class="muted">{{ s.formula }} · {{ s.frecuencia }} · {{ s.sentido }}</p>
            <div class="grid2">
              <label>Año<input type="number" [(ngModel)]="anio" name="ca" /></label>
              <label>Periodo
                <select [(ngModel)]="periodo" name="cp">
                  @for (p of periodosDe(s.frecuencia); track p) {
                    <option [value]="p">{{ p }}</option>
                  }
                </select>
              </label>
              <label>Meta<input type="number" [(ngModel)]="meta" name="cm" step="0.01" /></label>
              <label>Resultado<input type="number" [(ngModel)]="resultado" name="cr" step="0.01" /></label>
            </div>
            <label>Observaciones<textarea [(ngModel)]="obs" name="co" rows="2"></textarea></label>
            <label>Seguimiento
              <select [(ngModel)]="seguimiento" name="cs">
                <option value="ABIERTO">Abierto</option>
                <option value="CERRADO">Cerrado</option>
              </select>
            </label>
            @if (color()) {
              <p class="dot big" [attr.data-c]="color()">Semáforo {{ color() }}</p>
            }
            <button type="button" class="btn" [disabled]="busy()" (click)="guardar()">Guardar</button>
            <h3>Histórico</h3>
            @for (r of hist(); track r.id) {
              <div class="hist">
                <span>{{ r.anio }}-{{ r.periodo }}</span>
                <span>meta {{ r.metaSnapshot }} / {{ r.valorResultado }}</span>
                <span class="dot" [attr.data-c]="r.colorSemaforo">{{ r.colorSemaforo }}</span>
              </div>
            } @empty {
              <p class="muted">Sin capturas.</p>
            }
          }
        </div>
      }
    </section>
  `,
  styles: `
    .page { display:grid; gap:1rem; }
    .head h2 { margin:0 0 .2rem; }
    .head p { margin:0; color:#64748b; }
    .tabs { display:flex; flex-wrap:wrap; gap:.35rem; margin-top:.75rem; }
    .tabs button { border:1px solid #cbd5e1; background:#fff; border-radius:.5rem; padding:.4rem .75rem; cursor:pointer; font-weight:700; color:#334155; }
    .tabs button.on { background:#1E3A8A; color:#fff; border-color:#1E3A8A; }
    .toolbar, .grid2 { display:flex; flex-wrap:wrap; gap:.75rem; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; }
    label { display:flex; flex-direction:column; gap:.25rem; font-size:.82rem; color:#64748b; font-weight:600; }
    input, select, textarea { font:inherit; border:1px solid #cbd5e1; border-radius:.5rem; padding:.5rem; color:#0f172a; }
    .kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(110px,1fr)); gap:.55rem; }
    .kpis article { background:#fff; border:1px solid #e2e8f0; border-radius:.75rem; padding:.75rem; }
    .kpis .azul { border-color:#3B82F6; } .kpis .verde { border-color:#22C55E; }
    .kpis .amarillo { border-color:#EAB308; } .kpis .rojo { border-color:#EF4444; }
    .kpis b { display:block; font-size:1.4rem; color:#1E3A8A; }
    .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:.75rem; }
    .card, .obj { background:#fff; border:1px solid #e2e8f0; border-radius:.75rem; padding:.85rem; text-align:left; }
    .card[data-c='ROJO'] { border-color:#EF4444; }
    .card[data-c='AMARILLO'] { border-color:#EAB308; }
    .row { display:flex; justify-content:space-between; gap:.5rem; }
    .dot { font-size:.72rem; font-weight:800; padding:.15rem .45rem; border-radius:999px; background:#e2e8f0; }
    .dot[data-c='AZUL'] { background:#DBEAFE; color:#1E3A8A; }
    .dot[data-c='VERDE'] { background:#DCFCE7; color:#166534; }
    .dot[data-c='AMARILLO'] { background:#FEF9C3; color:#854D0E; }
    .dot[data-c='ROJO'] { background:#FEE2E2; color:#991B1B; }
    .dot.big { font-size:1rem; padding:.5rem .75rem; display:inline-block; }
    table { width:100%; border-collapse:collapse; background:#fff; font-size:.9rem; }
    th, td { border-bottom:1px solid #e2e8f0; padding:.5rem; text-align:left; }
    .mini, .link { border:1px solid #cbd5e1; background:#fff; border-radius:.4rem; padding:.25rem .45rem; cursor:pointer; color:#1E3A8A; font-weight:700; }
    .link { border:0; background:transparent; padding:0; margin-top:.35rem; }
    .btn { border:0; border-radius:.55rem; padding:.7rem 1rem; background:#1E3A8A; color:#fff; font-weight:800; cursor:pointer; }
    .mapa { display:grid; gap:1rem; }
    .mapa h3 { margin:0 0 .4rem; color:#1E3A8A; }
    .obj { width:100%; cursor:pointer; display:flex; flex-direction:column; gap:.2rem; }
    .obj span, .muted { color:#64748b; font-size:.82rem; }
    .form { display:grid; gap:.65rem; max-width:640px; background:#fff; border:1px solid #e2e8f0; border-radius:.75rem; padding:1rem; }
    .hist { display:flex; justify-content:space-between; gap:.5rem; padding:.4rem 0; border-bottom:1px solid #f1f5f9; }
    .toast { background:#D1FAE5; color:#065F46; border-radius:.65rem; padding:.55rem .75rem; margin:0; }
  `,
})
export class SigHome implements OnInit {
  private readonly api = inject(SigApiService);
  readonly tabs: Array<{ id: Tab; label: string }> = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'mapa', label: 'Mapa' },
    { id: 'catalogo', label: 'Catálogo CMI' },
    { id: 'captura', label: 'Captura' },
  ];
  readonly perspectivas = ['FINANZAS', 'CLIENTES', 'PROCESOS', 'APRENDIZAJE'];
  readonly tab = signal<Tab>('dashboard');
  readonly dash = signal<SigDashboard | null>(null);
  readonly objetivos = signal<SigObjetivo[]>([]);
  readonly catalogo = signal<SigIndicador[]>([]);
  readonly hist = signal<SigResultado[]>([]);
  readonly sel = signal<SigIndicador | null>(null);
  readonly busy = signal(false);
  readonly msg = signal('');
  readonly color = signal('');
  area = '';
  filtroArea = '';
  anio = new Date().getFullYear();
  q = '';
  capturaId = '';
  periodo = '01';
  meta = 0;
  resultado = 0;
  obs = '';
  seguimiento = 'ABIERTO';

  ngOnInit(): void {
    this.loadDash();
    this.loadCatalogo();
    this.api.objetivos().subscribe({ next: (o) => this.objetivos.set(o) });
  }

  go(t: Tab): void {
    this.tab.set(t);
    if (t === 'dashboard') this.loadDash();
    if (t === 'catalogo') this.loadCatalogo();
  }

  noop(): void {
    /* template keyup for q filter */
  }

  loadDash(): void {
    this.api.dashboard(this.area || undefined, this.anio).subscribe({
      next: (d) => this.dash.set(d),
      error: () => this.msg.set('No se pudo cargar el dashboard'),
    });
  }

  loadCatalogo(): void {
    const q: Record<string, string> = {};
    if (this.filtroArea) q['area'] = this.filtroArea;
    this.api.indicadores(q).subscribe({
      next: (r) => this.catalogo.set(r),
      error: () => this.catalogo.set([]),
    });
  }

  catalogoFiltrado(): SigIndicador[] {
    const term = this.q.trim().toLowerCase();
    if (!term) return this.catalogo();
    return this.catalogo().filter(
      (i) =>
        i.codigo.toLowerCase().includes(term) ||
        i.nombre.toLowerCase().includes(term),
    );
  }

  objetivosBy(p: string): SigObjetivo[] {
    return this.objetivos().filter((o) => o.perspectiva === p);
  }

  fromMapa(objetivoId: string): void {
    this.api.indicadores({ objetivoId }).subscribe({
      next: (r) => {
        this.catalogo.set(r);
        this.filtroArea = '';
        this.tab.set('catalogo');
      },
    });
  }

  openCaptura(id: string): void {
    this.capturaId = id;
    this.tab.set('captura');
    this.onIndicador();
  }

  onIndicador(): void {
    const s = this.catalogo().find((i) => i.id === this.capturaId) || null;
    this.sel.set(s);
    this.color.set('');
    const pers = this.periodosDe(s?.frecuencia || 'MENSUAL');
    this.periodo = pers[0] || '01';
    if (!s) return;
    this.api.resultados(s.id, this.anio).subscribe({
      next: (h) => {
        this.hist.set(h);
        if (h[0]) {
          this.meta = Number(h[0].metaSnapshot);
        }
      },
    });
  }

  periodosDe(f: string): string[] {
    if (f === 'TRIMESTRAL') return ['T1', 'T2', 'T3', 'T4'];
    if (f === 'SEMESTRAL') return ['S1', 'S2'];
    if (f === 'ANUAL') return ['ANUAL'];
    return ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  }

  toggleActivo(i: SigIndicador): void {
    this.api.patchIndicador(i.id, { activo: !i.activo }).subscribe({
      next: () => {
        this.msg.set(i.activo ? 'Indicador inactivado' : 'Indicador activado');
        this.loadCatalogo();
      },
      error: (e) => this.msg.set(e?.error?.message || 'No se pudo actualizar'),
    });
  }

  guardar(): void {
    const s = this.sel();
    if (!s) return;
    this.busy.set(true);
    this.api
      .capturar({
        indicadorId: s.id,
        anio: Number(this.anio),
        periodo: this.periodo,
        meta: Number(this.meta),
        resultado: Number(this.resultado),
        observaciones: this.obs,
        seguimiento: this.seguimiento,
      })
      .subscribe({
        next: (r) => {
          this.busy.set(false);
          this.color.set(r.colorSemaforo);
          this.msg.set('Resultado guardado');
          this.onIndicador();
        },
        error: (e) => {
          this.busy.set(false);
          this.msg.set(e?.error?.message || 'No se pudo guardar');
        },
      });
  }
}
