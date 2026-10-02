import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RondasApiService, RondasHoy, RondasPunto } from '../../rondas/rondas-api.service';

@Component({
  selector: 'app-rondas-panel',
  imports: [DatePipe],
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
          <strong>1. Crear puntos GPS (ustedes)</strong>
          <p>En el puesto, párate donde el cliente pidió el punto, ponle nombre y toca <b>Tomar punto</b>. Eso guarda las coordenadas. No uses “iniciar ronda”.</p>
          <a [href]="puntosUrl" target="_blank" rel="noopener">{{ puntosUrl }}</a>
        </div>
        <button type="button" class="ghost" (click)="copiar(puntosUrl)">
          {{ copiado() === puntosUrl ? 'Copiado' : 'Copiar' }}
        </button>
      </aside>
      <aside class="link-box">
        <div>
          <strong>2. App del vigilante</strong>
          <p>Elige puesto, su nombre, cédula e inicia ronda. No crea puntos.</p>
          <a [href]="campoUrl" target="_blank" rel="noopener">{{ campoUrl }}</a>
        </div>
        <button type="button" class="ghost" (click)="copiar(campoUrl)">
          {{ copiado() === campoUrl ? 'Copiado' : 'Copiar' }}
        </button>
      </aside>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

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
                <th>Vigilante</th>
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
                  <td>{{ m.vigilanteNombre }}</td>
                  <td>{{ m.puestoNombre }}</td>
                  <td>{{ m.puntoNombre }}</td>
                  <td>{{ m.distanciaAlPunto }} m @if (m.desfaseReloj) { · reloj }</td>
                </tr>
              } @empty {
                <tr><td colspan="5">Aún no hay marcas hoy.</td></tr>
              }
            </tbody>
          </table>
        </div>
      }

      <h3>Puntos GPS</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Puesto</th>
              <th>Orden</th>
              <th>Punto</th>
              <th>Radio</th>
            </tr>
          </thead>
          <tbody>
            @for (p of puntos(); track p.id) {
              <tr>
                <td>{{ p.puestoNombre }}</td>
                <td>{{ p.orden }}</td>
                <td>{{ p.nombre }}</td>
                <td>{{ p.radioMetros }} m</td>
              </tr>
            } @empty {
              <tr><td colspan="4">Nadie ha plantado puntos todavía. Usa la URL del celular.</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1.1rem; }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.15rem; }
    .head p, .link-box p { margin: 0; color: var(--text-muted, #6b7280); font-size: 0.9rem; }
    .link-box {
      display: flex; gap: 1rem; justify-content: space-between; align-items: center;
      flex-wrap: wrap; padding: 1rem; border: 1px solid var(--border, #e5e7eb);
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
    .error { color: var(--error-600); }
    tr.urgente td { background: color-mix(in srgb, var(--error-600, #b91c1c) 14%, var(--surface)); font-weight: 700; }
  `,
})
export class RondasPanel implements OnInit {
  private readonly api = inject(RondasApiService);
  readonly campoUrl = `${location.origin}/rondas`;
  readonly puntosUrl = `${location.origin}/rondas/puntos`;
  hoy = signal<RondasHoy | null>(null);
  puntos = signal<RondasPunto[]>([]);
  error = signal('');
  copiado = signal('');

  ngOnInit(): void {
    this.cargar();
    setInterval(() => this.cargar(), 15000);
  }

  private cargar() {
    this.api.hoy().subscribe({
      next: (h: RondasHoy) => this.hoy.set(h),
      error: () => this.error.set('No se pudo cargar el cumplimiento.'),
    });
    this.api.puntosAdmin().subscribe({
      next: (p: RondasPunto[]) => this.puntos.set(p),
      error: () => undefined,
    });
  }

  copiar(url: string) {
    void navigator.clipboard.writeText(url).then(() => {
      this.copiado.set(url);
      setTimeout(() => this.copiado.set(''), 2000);
    });
  }
}
