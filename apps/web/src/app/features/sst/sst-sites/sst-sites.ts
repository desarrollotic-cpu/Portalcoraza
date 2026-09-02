import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../../shared/services/toast.service';
import {
  SstApiService,
  SstClient,
  SstWorkplace,
  SstWorkplaceType,
} from '../sst-api.service';

@Component({
  selector: 'app-sst-sites',
  imports: [FormsModule],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Clientes y puestos SST</h2>
          <p>Sitios propios del módulo (opcionalmente enlazables a un post del portal).</p>
        </div>
      </header>

      <div class="grid">
        <form class="card" (ngSubmit)="createClient()">
          <h3>Nuevo cliente</h3>
          <label>
            Nombre
            <input [(ngModel)]="clientNombre" name="clientNombre" required />
          </label>
          <label>
            NIT
            <input [(ngModel)]="clientNit" name="clientNit" />
          </label>
          <button type="submit" class="btn" [disabled]="busy()">Guardar cliente</button>
        </form>

        <form class="card" (ngSubmit)="createWorkplace()">
          <h3>Nuevo puesto</h3>
          <label>
            Cliente
            <select [(ngModel)]="wpClientId" name="wpClientId" required>
              <option value="">Seleccione…</option>
              @for (c of clients(); track c.id) {
                <option [value]="c.id">{{ c.nombre }}</option>
              }
            </select>
          </label>
          <label>
            Nombre del puesto
            <input [(ngModel)]="wpNombre" name="wpNombre" required />
          </label>
          <label>
            Ciudad
            <input [(ngModel)]="wpCiudad" name="wpCiudad" />
          </label>
          <label>
            Tipo
            <select [(ngModel)]="wpTipo" name="wpTipo">
              @for (t of tipos; track t) {
                <option [value]="t">{{ t }}</option>
              }
            </select>
          </label>
          <button type="submit" class="btn" [disabled]="busy()">Guardar puesto</button>
        </form>
      </div>

      <div class="card">
        <div class="card-header-search">
          <h3>Puestos activos ({{ filteredWorkplaces().length }} de {{ workplaces().length }})</h3>
          <input
            type="search"
            placeholder="Buscar por puesto, cliente o ciudad…"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            class="search-input"
          />
        </div>
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Puesto</th>
              <th>Ciudad</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            @for (w of filteredWorkplaces(); track w.id) {
              <tr>
                <td>{{ w.client?.nombre || '—' }}</td>
                <td>{{ w.nombre }}</td>
                <td>{{ w.ciudad }}</td>
                <td>{{ w.tipoPuesto }}</td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" class="empty">No se encontraron puestos que coincidan con la búsqueda.</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1.25rem; }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.25rem; }
    .head p { margin: 0; color: var(--text-muted, #64748b); font-size: 0.9rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem; }
    .card {
      background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
      border-radius: 0.75rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.65rem;
    }
    .card h3 { margin: 0; font-size: 1rem; }
    .card-header-search {
      display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;
    }
    .search-input {
      font: inherit; padding: 0.4rem 0.75rem; border-radius: 0.45rem; border: 1px solid var(--border, #cbd5e1);
      width: 100%; max-width: 320px; font-size: 0.85rem;
    }
    label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; font-weight: 600; }
    input, select {
      font: inherit; font-weight: 400; padding: 0.5rem 0.65rem; border-radius: 0.45rem;
      border: 1px solid var(--border, #cbd5e1); background: var(--bg, #fff);
    }
    .btn {
      align-self: flex-start; padding: 0.5rem 0.9rem; border: 0; border-radius: 0.5rem;
      background: var(--brand, #0f766e); color: #fff; font-weight: 600; cursor: pointer;
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.5rem 0.35rem; border-bottom: 1px solid var(--border, #e2e8f0); }
    .empty { color: var(--text-muted, #64748b); text-align: center; padding: 1rem !important; }
  `,
})
export class SstSites implements OnInit {
  private readonly api = inject(SstApiService);
  private readonly toast = inject(ToastService);

  readonly clients = signal<SstClient[]>([]);
  readonly workplaces = signal<SstWorkplace[]>([]);
  readonly busy = signal(false);
  readonly searchQuery = signal('');

  readonly filteredWorkplaces = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.workplaces();
    if (!q) return list;
    return list.filter(
      (w) =>
        w.nombre.toLowerCase().includes(q) ||
        (w.client?.nombre && w.client.nombre.toLowerCase().includes(q)) ||
        (w.ciudad && w.ciudad.toLowerCase().includes(q)) ||
        (w.tipoPuesto && w.tipoPuesto.toLowerCase().includes(q)),
    );
  });

  readonly tipos: SstWorkplaceType[] = [
    'PORTERIA',
    'RECEPCION',
    'PERIMETRO',
    'CCTV',
    'MOVIL',
    'ALTURAS',
    'OTRO',
  ];

  clientNombre = '';
  clientNit = '';
  wpClientId = '';
  wpNombre = '';
  wpCiudad = 'Medellín';
  wpTipo: SstWorkplaceType = 'OTRO';

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.listClients().subscribe({
      next: (c) => this.clients.set(c),
      error: (e) => this.toast.error(e?.error?.message || 'Error cargando clientes'),
    });
    this.api.listWorkplaces().subscribe({
      next: (w) => this.workplaces.set(w),
      error: (e) => this.toast.error(e?.error?.message || 'Error cargando puestos'),
    });
  }

  createClient(): void {
    if (!this.clientNombre.trim()) return;
    this.busy.set(true);
    this.api
      .createClient({
        nombre: this.clientNombre.trim(),
        nit: this.clientNit.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.clientNombre = '';
          this.clientNit = '';
          this.toast.success('Cliente creado');
          this.reload();
        },
        error: (e) => {
          this.busy.set(false);
          this.toast.error(e?.error?.message || 'No se pudo crear el cliente');
        },
      });
  }

  createWorkplace(): void {
    if (!this.wpClientId || !this.wpNombre.trim()) return;
    this.busy.set(true);
    this.api
      .createWorkplace({
        clientId: this.wpClientId,
        nombre: this.wpNombre.trim(),
        ciudad: this.wpCiudad.trim() || 'Medellín',
        tipoPuesto: this.wpTipo,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.wpNombre = '';
          this.toast.success('Puesto creado');
          this.reload();
        },
        error: (e) => {
          this.busy.set(false);
          this.toast.error(e?.error?.message || 'No se pudo crear el puesto');
        },
      });
  }
}
