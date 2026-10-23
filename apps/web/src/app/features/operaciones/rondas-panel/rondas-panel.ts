import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RondasApiService, RondasHoy, RondasPost } from '../../rondas/rondas-api.service';

@Component({
  selector: 'app-rondas-panel',
  imports: [DatePipe, FormsModule, RouterLink],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Marcación de rondas</h2>
          <p>
            El vigilante no escanea QR: pasa por los puntos GPS. Sin datos, las marcas
            quedan en el teléfono y suben al tener red.
          </p>
        </div>
      </header>

      <aside class="link-box">
        <div>
          <strong>App del vigilante</strong>
          <p>
            Esta dirección es solo para el vigilante: elige puesto, su nombre y cédula, e inicia
            la ronda. No crea puntos. Los puntos se toman abajo, desde aquí.
          </p>
          <a [href]="campoUrl" target="_blank" rel="noopener">{{ campoUrl }}</a>
        </div>
        <button type="button" class="ghost" (click)="copiar(campoUrl)">
          {{ copiado() === campoUrl ? 'Copiado' : 'Copiar' }}
        </button>
      </aside>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <aside class="link-box">
        <div>
          <strong>Cumplimiento · informe mensual (PDF)</strong>
          <p>Un PDF por puesto: cuántas rondas, a qué hora empezó, cada punto y a qué hora cerró.</p>
        </div>
        <label class="mes">
          Puesto
          <select [(ngModel)]="puestoInforme">
            <option value="">— elige el puesto —</option>
            @for (p of puestos(); track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select>
        </label>
        <label class="mes">
          Mes
          <input type="month" [(ngModel)]="mesInforme" />
        </label>
        <button
          type="button"
          class="ghost"
          [disabled]="bajando() || !puestoInforme"
          (click)="descargarInforme()"
        >
          {{ bajando() ? 'Generando…' : 'Descargar PDF' }}
        </button>
      </aside>

      @if (hoy(); as h) {
        <div class="kpis">
          <article>
            <span>Hoy</span>
            <strong>{{ h.cumplimientoPct }}%</strong>
          </article>
          <article>
            <span>Rondas completas</span>
            <strong>{{ h.rondasCompletas }}</strong>
          </article>
          <article>
            <span>Puestos con puntos</span>
            <strong>{{ h.puestos }}</strong>
          </article>
        </div>

        <h3>Por puesto</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Puesto</th>
                <th>Puntos</th>
                <th>Marcados hoy</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              @for (p of h.porPuesto; track p.postId) {
                <tr>
                  <td>{{ p.puestoNombre }}</td>
                  <td>{{ p.esperados }}</td>
                  <td>{{ p.marcados }}</td>
                  <td>{{ p.porcentaje }}% {{ p.completa ? '· completa' : '' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <h3>Alertas del vigilante</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Tipo</th>
                <th>Ronda</th>
                <th>Puesto</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              @for (a of h.alertas || []; track a.id) {
                <tr [class.urgente]="a.tipo === 'EMERGENCIA'">
                  <td>{{ a.fechaHora | date: 'HH:mm' }}</td>
                  <td>{{ a.tipo }}</td>
                  <td>{{ a.vigilanteNombre }}</td>
                  <td>{{ a.puestoNombre }}</td>
                  <td>{{ a.mensaje || '—' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5">Hoy no hay alertas.</td></tr>
              }
            </tbody>
          </table>
        </div>

        <h3>Últimas marcaciones</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Vigilante</th>
                <th>Puesto</th>
                <th>Punto</th>
                <th>Dist.</th>
              </tr>
            </thead>
            <tbody>
              @for (m of h.marcaciones; track m.id) {
                <tr>
                  <td>{{ m.fechaHora | date: 'HH:mm' }}</td>
                  <td>{{ m.rondaNombre }}</td>
                  <td>{{ m.puestoNombre }}</td>
                  <td>{{ m.puntoNombre }}</td>
                  <td>
                    {{ m.distanciaAlPunto }} m
                    @if (m.fueraDeRango) {
                      <b class="fuera" title="Marcó fuera del radio del punto">· fuera</b>
                    }
                    @if (m.desfaseReloj) { · reloj }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="5">Aún no hay marcas hoy.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }

      <aside class="link-box">
        <div>
          <strong>Rondas y puntos</strong>
          <p>Las rondas y sus puntos se crean y se editan en Rondas → Rondas y puntos.</p>
          <a routerLink="/control-rondas/puntos">Ir a Rondas y puntos</a>
        </div>
      </aside>
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1.1rem; }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.15rem; }
    .head p, .link-box p { margin: 0; color: var(--text-muted, #6b7280); font-size: 0.9rem; }
    .link-box {
      display: flex; gap: 1rem; justify-content: space-between; align-items: center;
      flex-wrap: wrap; padding: 1rem; border: 1px solid var(--border, color-mix(in srgb, #2d5dbe 32%, var(--surface)));
      border-radius: 12px; background: var(--surface, #fff);
    }
    .link-box a { color: var(--primary-600); word-break: break-all; font-weight: 600; }
    .ghost {
      border: 1px solid var(--border); background: var(--surface); color: var(--primary-700);
      border-radius: var(--radius-sm); padding: 0.5rem 0.8rem; cursor: pointer; font-weight: 600;
    }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.8rem; }
    .kpis article {
      border: 1px solid var(--border); border-radius: var(--radius); padding: 0.85rem 1rem;
      background: var(--surface);
    }
    .kpis span { display: block; font-size: 0.75rem; color: var(--text-muted); }
    .kpis strong { font-size: 1.35rem; color: var(--primary-800); }
    h3 { margin: 0.4rem 0 0; font-size: 1rem; }
    .table-wrap { overflow: auto; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.5rem 0.7rem; border-top: 1px solid var(--border); }
    thead th { background: var(--gradient-hero); color: var(--text-on-dark); border: 0; }
    .error { color: var(--error-text); }
    /* Las marcas fuera del radio se guardan igual, para no trabar la ronda ni
       esconder el dato. Se senalan aqui para que alguien las revise. */
    .fuera { color: var(--error-text, #b91c1c); font-weight: 800; }
    tr.urgente td { background: color-mix(in srgb, var(--error-600, #b91c1c) 14%, var(--surface)); font-weight: 700; }
    .mes { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); min-width: 180px; }
    .mes input, .mes select { min-height: 40px; padding: 0.35rem 0.5rem; border: 1px solid var(--border); border-radius: var(--radius-sm); font: inherit; background: var(--surface); color: inherit; }
  `,
})
export class RondasPanel implements OnInit {
  private readonly api = inject(RondasApiService);
  readonly campoUrl = `${location.origin}/rondas`;
  hoy = signal<RondasHoy | null>(null);
  puestos = signal<RondasPost[]>([]);
  error = signal('');
  copiado = signal('');
  bajando = signal(false);
  puestoInforme = '';
  mesInforme = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date());

  ngOnInit(): void {
    this.cargar();
    this.cargarPuestos();
    setInterval(() => this.cargar(), 15000);
  }

  private cargar() {
    this.api.hoy().subscribe({
      next: (h: RondasHoy) => this.hoy.set(h),
      error: () => this.error.set('No se pudo cargar el cumplimiento.'),
    });
  }

  private cargarPuestos() {
    this.api.puestosSetup().subscribe({
      next: (ps) => this.puestos.set(ps),
      // No bloquea el panel: si no cargan, el select queda vacío y el botón
      // deshabilitado, que es lo correcto.
      error: () => {},
    });
  }

  descargarInforme() {
    const [ys, ms] = this.mesInforme.split('-');
    const anio = Number(ys);
    const mes = Number(ms);
    if (!anio || !mes) {
      this.error.set('Elige el mes del informe.');
      return;
    }
    if (!this.puestoInforme) {
      this.error.set('Elige el puesto del informe.');
      return;
    }
    const puesto = this.puestos().find((p) => p.id === this.puestoInforme);
    const nombre = (puesto?.name || 'puesto')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    this.bajando.set(true);
    this.api.informe(anio, mes, this.puestoInforme).subscribe({
      next: (blob) => {
        const a = document.createElement('a');
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = `Informe_Rondas_${nombre}_${this.mesInforme}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        this.bajando.set(false);
      },
      error: () => {
        this.bajando.set(false);
        this.error.set('No se pudo generar el informe.');
      },
    });
  }

  copiar(url: string) {
    void navigator.clipboard.writeText(url).then(() => {
      this.copiado.set(url);
      setTimeout(() => this.copiado.set(''), 2000);
    });
  }
}
