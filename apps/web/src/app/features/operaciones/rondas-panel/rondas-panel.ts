import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RondasApiService, RondasHoy, RondasPunto } from '../rondas/rondas-api.service';

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
          <strong>URL para el celular del puesto</strong>
          <p>Sistemas abre este enlace al entregar el teléfono, planta los puntos y deja el puesto vinculado.</p>
          <a [href]="campoUrl" target="_blank" rel="noopener">{{ campoUrl }}</a>
        </div>
        <button type="button" class="ghost" (click)="copiar()">{{ copiado() ? 'Copiado' : 'Copiar link' }}</button>
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
    .link-box a { color: var(--coraza-primary, #166534); word-break: break-all; }
    .ghost {
      border: 1px solid var(--border, #e5e7eb); background: #fff; border-radius: 8px;
      padding: 0.5rem 0.8rem; cursor: pointer;
    }
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.8rem; }
    .kpis article {
      border: 1px solid var(--border, #e5e7eb); border-radius: 10px; padding: 0.85rem 1rem;
      background: var(--surface, #fff);
    }
    .kpis span { display: block; font-size: 0.75rem; color: #6b7280; }
    .kpis strong { font-size: 1.35rem; }
    h3 { margin: 0.4rem 0 0; font-size: 1rem; }
    .table-wrap { overflow: auto; border: 1px solid var(--border, #e5e7eb); border-radius: 10px; background: #fff; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.5rem 0.7rem; border-top: 1px solid #f3f4f6; }
    thead th { background: #14532d; color: #fff; border: 0; }
    .error { color: #b91c1c; }
  `,
})
export class RondasPanel implements OnInit {
  private readonly api = inject(RondasApiService);
  readonly campoUrl = `${location.origin}/#/rondas`;
  hoy = signal<RondasHoy | null>(null);
  puntos = signal<RondasPunto[]>([]);
  error = signal('');
  copiado = signal(false);

  ngOnInit(): void {
    this.api.hoy().subscribe({
      next: (h) => this.hoy.set(h),
      error: () => this.error.set('No se pudo cargar el cumplimiento.'),
    });
    this.api.puntosAdmin().subscribe({
      next: (p) => this.puntos.set(p),
      error: () => {},
    });
  }

  copiar() {
    void navigator.clipboard.writeText(this.campoUrl).then(() => {
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2000);
    });
  }
}
