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
          <p>Gestión de clientes y puestos operativos del sistema Coraza para inspecciones IPT.</p>
        </div>
      </header>

      <div class="grid">
        <form class="card" (ngSubmit)="createClient()">
          <h3>Nuevo cliente</h3>
          <label>
            Nombre del cliente o empresa <span class="req">*</span>
            <input [(ngModel)]="clientNombre" name="clientNombre" placeholder="Ej. Urbanización El Poblado" required />
          </label>
          <label>
            NIT
            <input [(ngModel)]="clientNit" name="clientNit" placeholder="Ej. 900.123.456-7" />
          </label>
          <label>
            Contacto / Teléfono
            <input [(ngModel)]="clientContacto" name="clientContacto" placeholder="Ej. Administración - 3001234567" />
          </label>
          <button type="submit" class="btn" [disabled]="busy() || !clientNombre.trim()">Guardar cliente</button>
        </form>

        <form class="card" (ngSubmit)="createWorkplace()">
          <h3>Nuevo puesto</h3>

          <!-- Buscador inteligente de Cliente -->
          <div class="field-group">
            <label class="field-label">
              Cliente asociado <span class="req">*</span>
            </label>

            @if (selectedClient(); as selC) {
              <div class="selected-client-box">
                <div class="sel-c-info">
                  <span class="tag-c">CLIENTE SELECCIONADO</span>
                  <strong>{{ selC.nombre }}</strong>
                  @if (selC.nit && selC.nit !== 'N/A') {
                    <span class="meta">NIT: {{ selC.nit }}</span>
                  }
                </div>
                <button type="button" class="btn-change-c" (click)="clearSelectedClient()">Cambiar</button>
              </div>
            } @else {
              <div class="search-combobox">
                <div class="search-input-wrapper">
                  <span class="search-icon">🔍</span>
                  <input
                    type="text"
                    [ngModel]="searchClientQuery()"
                    (ngModelChange)="onSearchClientChange($event)"
                    (focus)="clientDropdownOpen.set(true)"
                    placeholder="Escribe para buscar cliente (ej. Macrocapital, Hotelera)..."
                    class="combobox-input"
                    autocomplete="off"
                  />
                  @if (searchClientQuery()) {
                    <button type="button" class="btn-clear-search" (click)="searchClientQuery.set('')">✕</button>
                  }
                </div>

                @if (clientDropdownOpen() && filteredClients().length > 0) {
                  <div class="results-dropdown">
                    <div class="dropdown-header">
                      <span>{{ filteredClients().length }} cliente(s) encontrado(s)</span>
                      <button type="button" class="btn-close-drop" (click)="clientDropdownOpen.set(false)">Cerrar ✕</button>
                    </div>
                    <div class="results-list">
                      @for (c of filteredClients(); track c.id) {
                        <div class="result-item" (click)="selectClient(c)">
                          <strong class="item-name">{{ c.nombre }}</strong>
                          @if (c.nit && c.nit !== 'N/A') {
                            <span class="item-meta">NIT: {{ c.nit }}</span>
                          }
                        </div>
                      }
                    </div>
                  </div>
                } @else if (clientDropdownOpen() && searchClientQuery().trim() && filteredClients().length === 0) {
                  <div class="results-dropdown empty-dropdown">
                    <p>No se encontró ningún cliente que coincida con "<strong>{{ searchClientQuery() }}</strong>".</p>
                  </div>
                }
              </div>
            }
          </div>

          <label>
            Nombre del puesto <span class="req">*</span>
            <input [(ngModel)]="wpNombre" name="wpNombre" placeholder="Ej. Portería Principal, Recepción Torre 1" required />
          </label>
          <div class="row2">
            <label>
              Ciudad
              <input [(ngModel)]="wpCiudad" name="wpCiudad" placeholder="Medellín" />
            </label>
            <label>
              Tipo de puesto
              <select [(ngModel)]="wpTipo" name="wpTipo">
                @for (t of tipos; track t) {
                  <option [value]="t">{{ t }}</option>
                }
              </select>
            </label>
          </div>
          <label>
            Dirección
            <input [(ngModel)]="wpDireccion" name="wpDireccion" placeholder="Calle / Carrera / Sector" />
          </label>
          <button type="submit" class="btn" [disabled]="busy() || !wpClientId || !wpNombre.trim()">Guardar puesto</button>
        </form>
      </div>

      <div class="card">
        <div class="card-header-search">
          <div>
            <h3>Catálogo de puestos del sistema ({{ filteredWorkplaces().length }} de {{ workplaces().length }})</h3>
            <p class="subtitle-puestos">Sincronizados automáticamente desde Operaciones y Recepción.</p>
          </div>
          <input
            type="search"
            placeholder="🔍 Buscar por puesto, cliente o ciudad…"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            class="search-input"
          />
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 32%;">Cliente</th>
              <th style="width: 32%;">Puesto</th>
              <th style="width: 18%;">Ciudad</th>
              <th style="width: 18%;">Tipo de puesto</th>
            </tr>
          </thead>
          <tbody>
            @for (w of filteredWorkplaces(); track w.id) {
              <tr>
                <td>
                  <strong>{{ w.client?.nombre || '—' }}</strong>
                </td>
                <td>{{ w.nombre }}</td>
                <td>{{ w.ciudad }}</td>
                <td>
                  <span class="badge-tipo">{{ w.tipoPuesto }}</span>
                </td>
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
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.25rem; }
    .card {
      background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
      border-radius: 0.75rem; padding: 1.15rem; display: flex; flex-direction: column; gap: 0.85rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    }
    .card h3 { margin: 0; font-size: 1.05rem; color: #0f172a; }
    .subtitle-puestos { margin: 0.15rem 0 0; font-size: 0.8rem; color: #64748b; }
    .card-header-search {
      display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap;
    }
    .search-input {
      font: inherit; padding: 0.5rem 0.85rem; border-radius: 0.5rem; border: 1.5px solid var(--border, #cbd5e1);
      width: 100%; max-width: 360px; font-size: 0.88rem; background: var(--bg, #fff);
    }
    .search-input:focus { border-color: var(--brand, #0f766e); outline: none; }
    .field-group { display: flex; flex-direction: column; gap: 0.35rem; }
    .field-label { font-size: 0.85rem; font-weight: 600; color: #1e293b; }
    .req { color: #dc2626; font-weight: 700; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.65rem; }
    label { display: flex; flex-direction: column; gap: 0.3rem; font-size: 0.85rem; font-weight: 600; }
    input, select {
      font: inherit; font-weight: 400; padding: 0.5rem 0.65rem; border-radius: 0.45rem;
      border: 1px solid var(--border, #cbd5e1); background: var(--bg, #fff); font-size: 0.88rem;
    }
    input:focus, select:focus { border-color: var(--brand, #0f766e); outline: none; }
    .btn {
      align-self: flex-start; padding: 0.55rem 1rem; border: 0; border-radius: 0.5rem;
      background: var(--brand, #0f766e); color: #fff; font-weight: 600; font-size: 0.88rem; cursor: pointer;
    }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    th, td { text-align: left; padding: 0.6rem 0.45rem; border-bottom: 1px solid var(--border, #e2e8f0); }
    th { color: var(--text-muted, #64748b); font-size: 0.78rem; font-weight: 600; text-transform: uppercase; }
    .badge-tipo {
      background: #f1f5f9; color: #334155; font-size: 0.72rem; font-weight: 700;
      padding: 0.15rem 0.45rem; border-radius: 0.3rem; border: 1px solid #e2e8f0;
    }
    .empty { color: var(--text-muted, #64748b); text-align: center; padding: 1.5rem !important; }

    /* Combobox Clientes */
    .search-combobox { position: relative; width: 100%; }
    .search-input-wrapper {
      position: relative; display: flex; align-items: center; width: 100%;
    }
    .search-icon {
      position: absolute; left: 0.75rem; color: #64748b; font-size: 0.85rem; pointer-events: none;
    }
    .combobox-input {
      width: 100%; padding-left: 2.1rem; padding-right: 2rem;
      border: 1.5px solid #0f766e; background: #f8fafc; font-size: 0.88rem;
    }
    .btn-clear-search {
      position: absolute; right: 0.5rem; background: transparent; border: 0;
      color: #94a3b8; font-size: 0.85rem; cursor: pointer; padding: 0.2rem 0.35rem;
    }
    .results-dropdown {
      position: absolute; top: calc(100% + 3px); left: 0; right: 0; z-index: 50;
      background: #fff; border: 1px solid #cbd5e1; border-radius: 0.6rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15); max-height: 240px; display: flex; flex-direction: column; overflow: hidden;
    }
    .dropdown-header {
      display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.75rem;
      background: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-size: 0.75rem; font-weight: 600; color: #475569;
    }
    .btn-close-drop {
      background: transparent; border: 0; color: #64748b; font-size: 0.75rem; cursor: pointer; font-weight: 600;
    }
    .results-list { overflow-y: auto; display: flex; flex-direction: column; }
    .result-item {
      padding: 0.55rem 0.75rem; border-bottom: 1px solid #f1f5f9; cursor: pointer;
      display: flex; flex-direction: column; gap: 0.1rem; transition: background 0.12s;
    }
    .result-item:hover { background: #f0fdfa; }
    .item-name { font-size: 0.88rem; color: #0f172a; }
    .item-meta { font-size: 0.75rem; color: #64748b; }
    .empty-dropdown { padding: 0.85rem; text-align: center; color: #64748b; font-size: 0.85rem; }

    /* Cliente seleccionado box */
    .selected-client-box {
      background: #f0fdfa; border: 1.5px solid #0f766e; border-radius: 0.55rem;
      padding: 0.65rem 0.85rem; display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;
    }
    .sel-c-info { display: flex; flex-direction: column; gap: 0.15rem; }
    .tag-c { font-size: 0.68rem; font-weight: 800; color: #0f766e; letter-spacing: 0.03em; }
    .btn-change-c {
      background: #fff; border: 1px solid #0f766e; color: #0f766e; border-radius: 0.4rem;
      padding: 0.3rem 0.65rem; font-size: 0.78rem; font-weight: 600; cursor: pointer;
    }
  `,
})
export class SstSites implements OnInit {
  private readonly api = inject(SstApiService);
  private readonly toast = inject(ToastService);

  readonly clients = signal<SstClient[]>([]);
  readonly workplaces = signal<SstWorkplace[]>([]);
  readonly busy = signal(false);
  readonly searchQuery = signal('');

  // Búsqueda de cliente para nuevo puesto
  readonly searchClientQuery = signal('');
  readonly clientDropdownOpen = signal(false);
  readonly selectedClient = signal<SstClient | null>(null);

  readonly filteredClients = computed(() => {
    const q = this.searchClientQuery().trim().toLowerCase();
    const list = this.clients();
    if (!q) return list.slice(0, 15);
    return list
      .filter((c) => {
        const n = c.nombre?.toLowerCase() || '';
        const nit = c.nit?.toLowerCase() || '';
        return n.includes(q) || nit.includes(q);
      })
      .slice(0, 25);
  });

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
  clientContacto = '';
  wpClientId = '';
  wpNombre = '';
  wpCiudad = 'Medellín';
  wpDireccion = '';
  wpTipo: SstWorkplaceType = 'OTRO';

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.api.listClients().subscribe({
      next: (c) => this.clients.set(c),
      error: (e: { error?: { message?: string } }) => this.toast.error(e?.error?.message || 'Error cargando clientes'),
    });
    this.api.listWorkplaces().subscribe({
      next: (w) => this.workplaces.set(w),
      error: (e: { error?: { message?: string } }) => this.toast.error(e?.error?.message || 'Error cargando puestos'),
    });
  }

  onSearchClientChange(text: string): void {
    this.searchClientQuery.set(text);
    this.clientDropdownOpen.set(true);
  }

  selectClient(c: SstClient): void {
    this.wpClientId = c.id;
    this.selectedClient.set(c);
    this.clientDropdownOpen.set(false);
    this.searchClientQuery.set('');
  }

  clearSelectedClient(): void {
    this.wpClientId = '';
    this.selectedClient.set(null);
    this.clientDropdownOpen.set(true);
  }

  createClient(): void {
    if (!this.clientNombre.trim()) return;
    this.busy.set(true);
    this.api
      .createClient({
        nombre: this.clientNombre.trim(),
        nit: this.clientNit.trim() || undefined,
        contacto: this.clientContacto.trim() || undefined,
      })
      .subscribe({
        next: (created) => {
          this.busy.set(false);
          this.clientNombre = '';
          this.clientNit = '';
          this.clientContacto = '';
          this.toast.success('Cliente creado con éxito');
          this.reload();
          // Auto-seleccionar en nuevo puesto
          this.selectClient(created);
        },
        error: (e: { error?: { message?: string } }) => {
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
        direccion: this.wpDireccion.trim() || undefined,
        tipoPuesto: this.wpTipo,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.wpNombre = '';
          this.wpDireccion = '';
          this.clearSelectedClient();
          this.toast.success('Puesto registrado con éxito');
          this.reload();
        },
        error: (e: { error?: { message?: string } }) => {
          this.busy.set(false);
          this.toast.error(e?.error?.message || 'No se pudo crear el puesto');
        },
      });
  }
}
