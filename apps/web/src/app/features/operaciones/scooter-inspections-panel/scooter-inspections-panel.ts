import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ScooterInspectionDetail,
  ScooterInspectionListItem,
  ScooterInspectionsApiService,
} from '../scooter-inspections-api.service';
import { OperacionesApiService, OperacionesPost } from '../operaciones-api.service';

const ANSWER_LABELS: Record<string, string> = {
  structureOk: 'Estructura en buen estado',
  platformOk: 'Plataforma de pies en buen estado',
  handlebarOk: 'Manubrio firme',
  steeringOk: 'Dirección responde',
  brakesOk: 'Frenos correctos',
  wheelsOk: 'Ruedas en buen estado',
  wheelsSecured: 'Ruedas aseguradas',
  batteryOk: 'Batería con carga suficiente',
  cablesOk: 'Sin cables sueltos o deteriorados',
  chargeIndicatorOk: 'Indicador de carga/encendido',
  lightsOk: 'Luces',
  reflectiveOk: 'Elementos reflectivos',
  vestWorn: 'Porta chaleco reflectivo',
  vestClean: 'Chaleco limpio y en buen estado',
  otherPpe: 'Demás elementos de protección',
  testRideOk: 'Prueba corta de desplazamiento',
  noAbnormalNoise: 'Sin ruidos/vibraciones anormales',
};

@Component({
  selector: 'app-scooter-inspections-panel',
  imports: [FormsModule, DatePipe],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Inspección patineta eléctrica</h2>
          <p>Consultar inspecciones preoperacionales diligenciadas en Minuta (PESV).</p>
        </div>
      </header>

      <div class="filters">
        <label>
          Puesto
          <select [(ngModel)]="postId" (ngModelChange)="reload()">
            <option value="">Todos</option>
            @for (p of posts(); track p.id) {
              <option [value]="p.id">{{ p.name }}</option>
            }
          </select>
        </label>
        <label>
          Desde
          <input type="date" [(ngModel)]="from" (ngModelChange)="reload()" />
        </label>
        <label>
          Hasta
          <input type="date" [(ngModel)]="to" (ngModelChange)="reload()" />
        </label>
        <label>
          Apta
          <select [(ngModel)]="apt" (ngModelChange)="reload()">
            <option value="">Todas</option>
            <option value="true">Sí</option>
            <option value="false">No</option>
          </select>
        </label>
        <label>
          Novedad
          <select [(ngModel)]="novelty" (ngModelChange)="reload()">
            <option value="">Todas</option>
            <option value="true">Con novedad</option>
            <option value="false">Sin novedad</option>
          </select>
        </label>
      </div>

      @if (error()) {
        <p class="error">{{ error() }}</p>
      }

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha / hora</th>
              <th>Puesto</th>
              <th>Vigilante</th>
              <th>Apta</th>
              <th>Novedad</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.id) {
              <tr>
                <td>{{ r.inspectedAt | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ r.postName }}</td>
                <td>{{ r.inspectorName }}</td>
                <td>{{ r.aptForOperation ? 'Sí' : 'No' }}</td>
                <td>{{ r.hasNovelty ? 'Sí' : 'No' }}</td>
                <td>
                  <button type="button" class="link" (click)="open(r.id)">Ver</button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6" class="muted">No hay inspecciones con esos filtros.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (detail(); as d) {
        <div class="backdrop" (click)="close()">
          <aside class="drawer" (click)="$event.stopPropagation()">
            <header>
              <h3>Detalle de inspección</h3>
              <button type="button" class="ghost" (click)="close()">Cerrar</button>
            </header>
            <p>
              <strong>{{ d.postName }}</strong><br />
              {{ d.inspectedAt | date: 'dd/MM/yyyy HH:mm' }} · {{ d.inspectorName }}
            </p>
            <p>
              ¿Recibe patineta? <b>{{ d.receivingScooter ? 'Sí' : 'No' }}</b><br />
              ¿Apta para operar? <b>{{ d.aptForOperation ? 'Sí' : 'No' }}</b>
            </p>
            <dl>
              @for (a of answerEntries(d); track a.key) {
                <div>
                  <dt>{{ a.label }}</dt>
                  <dd>{{ a.value }}</dd>
                </div>
              }
            </dl>
            @if (d.hasNovelty) {
              <div class="novelty">
                <strong>Novedad:</strong> {{ d.noveltyLabel || d.noveltyType }}<br />
                Reportada al supervisor:
                {{ d.noveltyReportedToSupervisor ? 'Sí' : 'No' }}<br />
                Retirada de operación:
                {{ d.noveltyWithdrawnFromService ? 'Sí' : 'No' }}
              </div>
            }
          </aside>
        </div>
      }
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1rem; }
    .head h2 { margin: 0 0 0.25rem; }
    .head p { margin: 0; color: var(--text-secondary); }
    .filters {
      display: flex; flex-wrap: wrap; gap: 0.75rem;
    }
    .filters label {
      display: flex; flex-direction: column; gap: 0.25rem;
      font-size: 0.8rem; color: var(--text-muted);
    }
    .filters input, .filters select {
      min-width: 9rem;
    }
    .table-wrap { overflow: auto; background: var(--surface); border-radius: var(--radius); border: 1px solid var(--border); }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { padding: 0.65rem 0.75rem; border-bottom: 1px solid var(--border); text-align: left; }
    th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
    .muted { color: var(--text-muted); }
    .error { color: var(--error-600); }
    .link {
      border: 0; background: transparent; color: var(--primary-600);
      font-weight: 600; cursor: pointer;
    }
    .backdrop {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
      display: flex; justify-content: flex-end; z-index: 40;
    }
    .drawer {
      width: min(420px, 100%); height: 100%; background: var(--surface);
      padding: 1.25rem; overflow: auto; box-shadow: var(--shadow-xl);
    }
    .drawer header { display: flex; justify-content: space-between; align-items: center; }
    .ghost { border: 1px solid var(--border); background: var(--surface-2); border-radius: var(--radius-sm); padding: 0.4rem 0.7rem; cursor: pointer; }
    dl { display: flex; flex-direction: column; gap: 0.55rem; margin: 1rem 0; }
    dl div { display: grid; grid-template-columns: 1fr auto; gap: 0.5rem; font-size: 0.9rem; }
    dt { color: var(--text-secondary); }
    dd { margin: 0; font-weight: 600; }
    .novelty {
      padding: 0.85rem; border-radius: var(--radius-sm);
      background: color-mix(in srgb, var(--warning-500) 12%, var(--surface));
      border: 1px solid color-mix(in srgb, var(--warning-500) 35%, var(--border));
      font-size: 0.9rem; line-height: 1.45;
    }
  `,
})
export class ScooterInspectionsPanel implements OnInit {
  private readonly api = inject(ScooterInspectionsApiService);
  private readonly ops = inject(OperacionesApiService);

  readonly posts = signal<OperacionesPost[]>([]);
  readonly rows = signal<ScooterInspectionListItem[]>([]);
  readonly detail = signal<ScooterInspectionDetail | null>(null);
  readonly error = signal('');

  postId = '';
  from = '';
  to = '';
  apt = '';
  novelty = '';

  ngOnInit(): void {
    this.ops.listPosts().subscribe({
      next: (rows) =>
        this.posts.set(rows.filter((p) => p.tienePatinetaElectrica || p.status === 'ACTIVO')),
      error: () => undefined,
    });
    this.reload();
  }

  reload(): void {
    this.error.set('');
    this.api
      .list({
        postId: this.postId || undefined,
        from: this.from || undefined,
        to: this.to || undefined,
        apt: this.apt || undefined,
        novelty: this.novelty || undefined,
      })
      .subscribe({
        next: (rows) => this.rows.set(rows),
        error: () => this.error.set('No se pudieron cargar las inspecciones.'),
      });
  }

  open(id: string): void {
    this.api.get(id).subscribe({
      next: (d) => this.detail.set(d),
      error: () => this.error.set('No se pudo abrir el detalle.'),
    });
  }

  close(): void {
    this.detail.set(null);
  }

  answerEntries(d: ScooterInspectionDetail): Array<{ key: string; label: string; value: string }> {
    return Object.entries(ANSWER_LABELS).map(([key, label]) => {
      const v = d.answers?.[key];
      let value = '—';
      if (v === true || v === 'SI') value = 'Sí';
      else if (v === false || v === 'NO') value = 'No';
      else if (v === 'NA') value = 'No aplica';
      return { key, label, value };
    });
  }
}
