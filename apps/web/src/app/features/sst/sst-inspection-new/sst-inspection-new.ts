import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/services/toast.service';
import { SstApiService, SstInspectionType, SstWorkplace } from '../sst-api.service';

@Component({
  selector: 'app-sst-inspection-new',
  imports: [FormsModule, RouterLink],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Nueva inspección IPT</h2>
          <p>
            <strong>IPT inicial:</strong> primera evaluación preventiva del puesto (34 ítems normativos).
            <strong>Seguimiento:</strong> control de hallazgos previos y verificación de planes de acción.
          </p>
        </div>
      </header>

      @if (!loading() && workplaces().length === 0) {
        <div class="warn">
          <p>No hay puestos SST disponibles en el sistema.</p>
          <div class="row">
            @if (auth.hasPermission('sst.manage')) {
              <a class="btn" routerLink="/sst/puestos">Ir a clientes y puestos</a>
            }
          </div>
        </div>
      } @else {
        <form class="card" (ngSubmit)="submit()">
          <!-- Selector Inteligente de Puesto con Buscador en tiempo real -->
          <div class="field-group">
            <label class="field-label">
              Puesto de trabajo a inspeccionar <span class="req">*</span>
            </label>

            @if (selectedWorkplace(); as sel) {
              <div class="selected-box">
                <div class="selected-info">
                  <span class="tag-selected">✓ PUESTO SELECCIONADO</span>
                  <div class="sel-title">{{ sel.nombre }}</div>
                  <div class="sel-meta">
                    <strong>Cliente:</strong> {{ sel.client?.nombre || '—' }} ·
                    <strong>Ciudad:</strong> {{ sel.ciudad }} ·
                    <strong>Tipo:</strong> {{ sel.tipoPuesto }}
                  </div>
                </div>
                <button type="button" class="btn-change" (click)="clearSelection()">
                  Cambiar puesto
                </button>
              </div>
            } @else {
              <div class="search-combobox">
                <div class="search-input-wrapper">
                  <span class="search-icon">🔍</span>
                  <input
                    type="text"
                    [ngModel]="searchWp()"
                    (ngModelChange)="onSearchChange($event)"
                    (focus)="dropdownOpen.set(true)"
                    name="searchWp"
                    placeholder="Escribe cualquier palabra del puesto o cliente (ej: Barquereña, Medellín)..."
                    class="combobox-input"
                    autocomplete="off"
                  />
                  @if (searchWp()) {
                    <button type="button" class="btn-clear-search" (click)="clearSearch()">✕</button>
                  }
                </div>

                @if (dropdownOpen() && filteredWorkplaces().length > 0) {
                  <div class="results-dropdown">
                    <div class="dropdown-header">
                      <span>{{ filteredWorkplaces().length }} puesto(s) encontrado(s)</span>
                      <button type="button" class="btn-close-drop" (click)="dropdownOpen.set(false)">Cerrar ✕</button>
                    </div>
                    <div class="results-list">
                      @for (w of filteredWorkplaces(); track w.id) {
                        <div class="result-item" (click)="selectWorkplace(w)">
                          <div class="item-main">
                            <strong class="item-name">{{ w.nombre }}</strong>
                            <span class="item-client">{{ w.client?.nombre || 'Coraza Seguridad' }}</span>
                          </div>
                          <div class="item-side">
                            <span class="item-city">{{ w.ciudad }}</span>
                            <span class="item-badge">{{ w.tipoPuesto }}</span>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                } @else if (dropdownOpen() && searchWp().trim() && filteredWorkplaces().length === 0) {
                  <div class="results-dropdown empty-dropdown">
                    <p>No se encontró ningún puesto que coincida con "<strong>{{ searchWp() }}</strong>".</p>
                  </div>
                }
              </div>
            }
          </div>

          <div class="row2">
            <label class="field-label">
              Tipo de inspección <span class="req">*</span>
              <select [(ngModel)]="tipo" name="tipo">
                <option value="IPT_INICIAL">IPT inicial (34 ítems)</option>
                <option value="SEGUIMIENTO">Seguimiento de hallazgos</option>
              </select>
            </label>

            <label class="field-label">
              Fecha de inspección <span class="req">*</span>
              <input type="date" [(ngModel)]="fecha" name="fecha" required />
            </label>
          </div>

          <div class="row2">
            <label class="field-label">
              Responsable / Inspector <span class="req">*</span>
              <input [(ngModel)]="responsableNombre" name="responsableNombre" placeholder="Nombre completo" required />
            </label>

            <label class="field-label">
              Cargo del evaluador
              <input [(ngModel)]="responsableCargo" name="responsableCargo" placeholder="Ej. Inspector SST" />
            </label>
          </div>

          <div class="form-actions">
            <button
              type="submit"
              class="btn-submit"
              [disabled]="busy() || !workplaceId || !responsableNombre.trim()"
            >
              {{ busy() ? 'Creando inspección…' : 'Crear y abrir formulario IPT (34 ítems)' }}
            </button>
            <a class="btn-cancel" routerLink="/sst/panel">Cancelar</a>
          </div>
        </form>
      }
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1.25rem; max-width: 680px; margin: 0 auto; }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.3rem; color: #0f172a; }
    .head p { margin: 0; color: var(--text-muted, #64748b); font-size: 0.88rem; line-height: 1.4; }
    .card, .warn {
      background: var(--surface, #fff); border: 1px solid var(--border, #e2e8f0);
      border-radius: 0.85rem; padding: 1.35rem; display: flex; flex-direction: column; gap: 1.25rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .field-group { display: flex; flex-direction: column; gap: 0.4rem; }
    .field-label {
      display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.88rem; font-weight: 600; color: #1e293b;
    }
    .req { color: #dc2626; font-weight: 700; }
    .row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    @media (max-width: 580px) { .row2 { grid-template-columns: 1fr; } }
    input, select {
      font: inherit; font-weight: 400; padding: 0.55rem 0.75rem; border-radius: 0.5rem;
      border: 1px solid var(--border, #cbd5e1); background: var(--bg, #fff); font-size: 0.9rem;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    input:focus, select:focus {
      outline: none; border-color: var(--brand, #0f766e);
      box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.15);
    }
    /* Buscador Combobox */
    .search-combobox { position: relative; width: 100%; }
    .search-input-wrapper {
      position: relative; display: flex; align-items: center; width: 100%;
    }
    .search-icon {
      position: absolute; left: 0.75rem; color: #64748b; font-size: 0.95rem; pointer-events: none;
    }
    .combobox-input {
      width: 100%; padding-left: 2.2rem; padding-right: 2.2rem;
      border: 1.5px solid #0f766e; background: #f8fafc; font-size: 0.92rem; font-weight: 500;
    }
    .btn-clear-search {
      position: absolute; right: 0.6rem; background: transparent; border: 0;
      color: #94a3b8; font-size: 0.9rem; cursor: pointer; padding: 0.2rem 0.4rem;
    }
    .results-dropdown {
      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 50;
      background: #fff; border: 1px solid #cbd5e1; border-radius: 0.65rem;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      max-height: 280px; display: flex; flex-direction: column; overflow: hidden;
    }
    .dropdown-header {
      display: flex; justify-content: space-between; align-items: center; padding: 0.45rem 0.75rem;
      background: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-size: 0.78rem; font-weight: 600; color: #475569;
    }
    .btn-close-drop {
      background: transparent; border: 0; color: #64748b; font-size: 0.78rem; cursor: pointer; font-weight: 600;
    }
    .results-list { overflow-y: auto; display: flex; flex-direction: column; }
    .result-item {
      padding: 0.65rem 0.85rem; border-bottom: 1px solid #f1f5f9; cursor: pointer;
      display: flex; justify-content: space-between; align-items: center; gap: 0.75rem;
      transition: background 0.12s;
    }
    .result-item:last-child { border-bottom: 0; }
    .result-item:hover { background: #f0fdfa; }
    .item-main { display: flex; flex-direction: column; gap: 0.15rem; }
    .item-name { font-size: 0.9rem; color: #0f172a; }
    .item-client { font-size: 0.78rem; color: #64748b; }
    .item-side { display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; }
    .item-city { font-size: 0.75rem; color: #475569; }
    .item-badge {
      background: #e2e8f0; color: #334155; font-size: 0.68rem; font-weight: 700;
      padding: 0.1rem 0.35rem; border-radius: 0.25rem;
    }
    .empty-dropdown { padding: 1rem; text-align: center; color: #64748b; font-size: 0.88rem; }

    /* Puesto Seleccionado Box */
    .selected-box {
      background: #f0fdfa; border: 1.5px solid #0f766e; border-radius: 0.65rem;
      padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem;
    }
    .selected-info { display: flex; flex-direction: column; gap: 0.25rem; }
    .tag-selected {
      font-size: 0.7rem; font-weight: 800; color: #0f766e; letter-spacing: 0.04em;
    }
    .sel-title { font-size: 1rem; font-weight: 700; color: #0f172a; }
    .sel-meta { font-size: 0.82rem; color: #475569; }
    .btn-change {
      background: #fff; border: 1px solid #0f766e; color: #0f766e; border-radius: 0.45rem;
      padding: 0.35rem 0.75rem; font-size: 0.82rem; font-weight: 600; cursor: pointer; white-space: nowrap;
    }
    .btn-change:hover { background: #f0fdfa; }

    /* Form Actions */
    .form-actions { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem; flex-wrap: wrap; }
    .btn-submit {
      padding: 0.65rem 1.25rem; border: 0; border-radius: 0.5rem;
      background: var(--brand, #0f766e); color: #fff; font-weight: 700; font-size: 0.95rem;
      cursor: pointer; transition: opacity 0.15s, transform 0.1s;
    }
    .btn-submit:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-cancel {
      color: #64748b; text-decoration: none; font-size: 0.9rem; font-weight: 600;
      padding: 0.5rem 0.75rem;
    }
  `,
})
export class SstInspectionNew implements OnInit {
  private readonly api = inject(SstApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly workplaces = signal<SstWorkplace[]>([]);
  readonly busy = signal(false);
  readonly loading = signal(true);
  readonly searchWp = signal('');
  readonly dropdownOpen = signal(false);
  readonly selectedWorkplace = signal<SstWorkplace | null>(null);

  workplaceId = '';
  tipo: SstInspectionType = 'IPT_INICIAL';
  fecha = new Date().toISOString().slice(0, 10);
  responsableNombre = this.auth.currentUser()?.fullName || 'Especialista SST Coraza';
  responsableCargo = 'Inspector SST';

  readonly filteredWorkplaces = computed(() => {
    const q = this.searchWp().trim().toLowerCase();
    const list = this.workplaces();
    if (!q) return list.slice(0, 20); // Muestra los primeros 20 por defecto
    return list
      .filter((w) => {
        const n = w.nombre?.toLowerCase() || '';
        const c = w.client?.nombre?.toLowerCase() || '';
        const city = w.ciudad?.toLowerCase() || '';
        const t = w.tipoPuesto?.toLowerCase() || '';
        return n.includes(q) || c.includes(q) || city.includes(q) || t.includes(q);
      })
      .slice(0, 30); // Limita a 30 mejores resultados para máxima agilidad
  });

  ngOnInit(): void {
    this.reloadWorkplaces();
  }

  onSearchChange(text: string): void {
    this.searchWp.set(text);
    this.dropdownOpen.set(true);
  }

  clearSearch(): void {
    this.searchWp.set('');
  }

  selectWorkplace(wp: SstWorkplace): void {
    this.workplaceId = wp.id;
    this.selectedWorkplace.set(wp);
    this.dropdownOpen.set(false);
    this.searchWp.set('');
  }

  clearSelection(): void {
    this.workplaceId = '';
    this.selectedWorkplace.set(null);
    this.dropdownOpen.set(true);
  }

  submit(): void {
    if (!this.workplaceId) {
      this.toast.error('Debes seleccionar un puesto de trabajo');
      return;
    }
    if (!this.responsableNombre.trim()) {
      this.toast.error('El nombre del responsable es obligatorio');
      return;
    }

    this.busy.set(true);
    this.api
      .createInspection({
        workplaceId: this.workplaceId,
        tipo: this.tipo,
        fecha: this.fecha || undefined,
        responsableNombre: this.responsableNombre.trim(),
        responsableCargo: this.responsableCargo.trim() || undefined,
      })
      .subscribe({
        next: (insp) => {
          this.busy.set(false);
          this.toast.success('Inspección iniciada — completa los 34 ítems del checklist');
          void this.router.navigate(['/sst/inspecciones', insp.id]);
        },
        error: (e: { error?: { message?: string } }) => {
          this.busy.set(false);
          this.toast.error(e?.error?.message || 'No se pudo crear la inspección');
        },
      });
  }

  private reloadWorkplaces(): void {
    this.loading.set(true);
    this.api.listWorkplaces().subscribe({
      next: (w) => {
        this.workplaces.set(w);
        this.loading.set(false);
      },
      error: (e: { error?: { message?: string } }) => {
        this.loading.set(false);
        this.toast.error(e?.error?.message || 'Error cargando puestos');
      },
    });
  }
}
