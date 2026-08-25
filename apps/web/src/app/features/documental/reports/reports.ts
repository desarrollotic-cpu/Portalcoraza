import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Analytics, DocumentalApiService } from '../documental-api.service';
import { DOC_STYLES } from '../documental.styles';

@Component({
  selector: 'app-doc-reports',
  imports: [FormsModule, DatePipe],
  template: `
    <h3>Informes</h3>
    <p class="muted">Herramientas → Informe ejecutivo a partir de los indicadores en vivo (como en SGD).</p>

    <form class="card" (ngSubmit)="generate()">
      <label class="full">Título del informe
        <input [(ngModel)]="titulo" name="titulo" />
      </label>
      <label>Fecha inicio<input type="date" [(ngModel)]="fechaInicio" name="fechaInicio" /></label>
      <label>Fecha fin<input type="date" [(ngModel)]="fechaFin" name="fechaFin" /></label>
      <label class="full">Nota legal
        <textarea [(ngModel)]="notaLegal" name="notaLegal" rows="2"></textarea>
      </label>
      <div class="full checks">
        <label class="chk"><input type="checkbox" [(ngModel)]="mods.minutas" name="minutas" /> Minutas</label>
        <label class="chk"><input type="checkbox" [(ngModel)]="mods.correspondencia" name="correspondencia" /> Correspondencia</label>
        <label class="chk"><input type="checkbox" [(ngModel)]="mods.personal" name="personal" /> Asociados retirados</label>
        <label class="chk"><input type="checkbox" [(ngModel)]="mods.contratos" name="contratos" /> Contratos</label>
        <label class="chk"><input type="checkbox" [(ngModel)]="mods.prestamos" name="prestamos" /> Préstamos</label>
      </div>
      <div class="actions">
        <button type="submit" class="btn-primary" [disabled]="loading()">Generar informe</button>
        @if (report()) {
          <button type="button" class="btn-ghost" (click)="print()">Imprimir / Guardar PDF</button>
          <button type="button" class="btn-ghost" (click)="report.set(null)">Volver a configurar</button>
        }
      </div>
    </form>

    @if (error()) {
      <p class="error">{{ error() }}</p>
    }

    @if (report(); as r) {
      <article id="informePrint" class="informe">
        <header>
          <strong>CORAZA SEGURIDAD C.T.A.</strong>
          <span>Cooperativa de Trabajo Asociado · Sistema de Gestión Documental</span>
          <h2>INFORME EJECUTIVO</h2>
          <p>{{ now | date: 'fullDate' }} · {{ now | date: 'shortTime' }}</p>
          @if (fechaInicio && fechaFin) {
            <p>Rango: {{ fechaInicio }} al {{ fechaFin }}</p>
          } @else {
            <p>Período: General acumulado</p>
          }
        </header>
        <h3>{{ titulo }}</h3>
        <p class="legal">{{ notaLegal }}</p>

        <div class="kpis">
          @if (mods.minutas) {
            <div class="kpi"><div class="n">{{ r.minutas }}</div><div class="l">Minutas de servicio</div></div>
          }
          @if (mods.correspondencia) {
            <div class="kpi"><div class="n">{{ r.correspondencia }}</div><div class="l">Correspondencia TRD</div></div>
          }
          @if (mods.personal) {
            <div class="kpi"><div class="n">{{ r.asociadosRetirados }}</div><div class="l">Asociados retirados</div></div>
          }
          @if (mods.contratos) {
            <div class="kpi"><div class="n">{{ r.contratos }}</div><div class="l">Contratos</div></div>
          }
          @if (mods.prestamos) {
            <div class="kpi">
              <div class="n">{{ r.prestamosDevueltos }}</div>
              <div class="l">Préstamos devueltos ({{ r.prestamosActivos }} activos)</div>
            </div>
          }
        </div>

        @if (mods.minutas) {
          <section>
            <h4>Distributivo de minutas</h4>
            <ul>
              <li>Puestos de vigilancia (SERVICIO): {{ r.minutasBreakdown['SERVICIO'] || 0 }}</li>
              <li>Control de visitantes: {{ r.minutasBreakdown['VISITANTES'] || 0 }}</li>
              <li>Correspondencia / novedades: {{ r.minutasBreakdown['CORRESPONDENCIA'] || 0 }}</li>
            </ul>
          </section>
        }

        <footer class="firmas">
          <div>
            <strong>REPRESENTANTE LEGAL / GERENCIA</strong>
            <span>Coraza Seguridad C.T.A.</span>
          </div>
          <div>
            <strong>COORDINACIÓN DE GESTIÓN DOCUMENTAL</strong>
            <span>Archivo General y Correspondencia</span>
          </div>
        </footer>
      </article>
    }
  `,
  styles: [
    DOC_STYLES,
    `
    .checks { display:flex; flex-wrap:wrap; gap:.75rem 1.25rem; }
    .chk { flex-direction:row; align-items:center; gap:.4rem; font-size:.9rem; color:var(--text-primary); }
    .chk input { width:auto; }
    .informe {
      margin-top:1.25rem; padding:1.5rem; border:1px solid var(--border);
      border-radius:12px; background:var(--surface); color:var(--text-primary);
    }
    .informe header { display:flex; flex-direction:column; gap:.2rem; margin-bottom:1rem; }
    .informe header h2 { margin:.5rem 0 0; font-size:1.2rem; }
    .informe .legal { font-size:.85rem; color:var(--text-secondary); margin-bottom:1rem; }
    .firmas {
      display:grid; grid-template-columns:1fr 1fr; gap:2rem; margin-top:2rem;
      padding-top:1.5rem; border-top:1px dashed var(--border); font-size:.85rem;
    }
    .firmas div { display:flex; flex-direction:column; gap:.35rem; min-height:4rem; }
    .firmas span { color:var(--text-muted); }
    @media print {
      form.card, h3, .muted, .actions, .error { display:none !important; }
      .informe { border:none; }
    }
  `,
  ],
})
export class ReportsScreen {
  private readonly api = inject(DocumentalApiService);

  titulo = 'Informe de Gestión Documental';
  notaLegal = 'Este informe es propiedad interna de Coraza Seguridad C.T.A. Contenido confidencial.';
  fechaInicio = '';
  fechaFin = '';
  mods = {
    minutas: true,
    correspondencia: true,
    personal: true,
    contratos: true,
    prestamos: true,
  };

  readonly report = signal<Analytics | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly now = new Date();

  generate(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.analytics().subscribe({
      next: (data) => {
        this.report.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudieron consultar los indicadores.');
      },
    });
  }

  print(): void {
    window.print();
  }
}
