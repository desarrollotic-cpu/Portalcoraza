import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ModalShell } from '../modal-shell/modal-shell';
import {
  PostEquipmentApiService,
  PostEquipmentCatalogDetail,
  PostEquipmentCatalogItem,
} from '../post-equipment-api.service';
import { PostEquipmentTabs } from '../post-equipment-tabs/post-equipment-tabs';

@Component({
  selector: 'app-post-equipment-catalog',
  imports: [FormsModule, RouterLink, PostEquipmentTabs, ModalShell],
  template: `
    <section>
      <app-post-equipment-tabs />

      <header class="page-head">
        <div>
          <h2>Inventario de elementos</h2>
          <p>
            Crea elementos con especificaciones opcionales y controla cuántos hay, cuántos están
            disponibles y en qué puestos están entregados.
          </p>
        </div>
      </header>

      @if (auth.hasPermission('post_equipment.manage')) {
        <div class="panel">
          <h3>Crear elemento</h3>
          <p class="hint">Solo código y nombre son obligatorios. El resto es opcional.</p>
          <form class="form" (ngSubmit)="createType()">
            <label>
              Código *
              <input [(ngModel)]="form.code" name="code" placeholder="SOMBRILLA" required />
            </label>
            <label>
              Nombre *
              <input [(ngModel)]="form.name" name="name" placeholder="Sombrilla" required />
            </label>
            <label>
              Categoría
              <input [(ngModel)]="form.category" name="category" placeholder="Mobiliario" />
            </label>
            <label>
              Marca
              <input [(ngModel)]="form.brand" name="brand" />
            </label>
            <label>
              Modelo
              <input [(ngModel)]="form.model" name="model" />
            </label>
            <label>
              Color
              <input [(ngModel)]="form.color" name="color" />
            </label>
            <label>
              Valor aprox.
              <input type="number" min="0" step="0.01" [(ngModel)]="form.approximateValue" name="value" />
            </label>
            <label>
              Cantidad inicial
              <input type="number" min="0" max="200" [(ngModel)]="form.initialQuantity" name="qty" />
            </label>
            <label class="wide">
              Descripción
              <input [(ngModel)]="form.description" name="description" />
            </label>
            <label class="wide">
              Especificaciones
              <input [(ngModel)]="form.specs" name="specs" placeholder="Tamaño, voltaje, accesorios…" />
            </label>
            <button type="submit" class="btn" [disabled]="saving()">Crear elemento</button>
          </form>
          @if (formError()) {
            <p class="error">{{ formError() }}</p>
          }
        </div>
      }

      <div class="kpis">
        <div><strong>{{ totals().types }}</strong><span>tipos</span></div>
        <div><strong>{{ totals().total }}</strong><span>unidades</span></div>
        <div><strong>{{ totals().available }}</strong><span>disponibles</span></div>
        <div class="warn"><strong>{{ totals().assigned }}</strong><span>en puestos</span></div>
      </div>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Elemento</th>
              <th>Especificaciones</th>
              <th>Total</th>
              <th>Disponibles</th>
              <th>En puestos</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (c of catalog(); track c.id) {
              <tr>
                <td>
                  <strong>{{ c.name }}</strong>
                  <div class="meta">{{ c.code }}@if (c.category) { · {{ c.category }} }</div>
                </td>
                <td class="specs">
                  @if (specLine(c); as specs) {
                    {{ specs }}
                  } @else {
                    <span class="muted">—</span>
                  }
                </td>
                <td>{{ c.totalUnits }}</td>
                <td>{{ c.availableUnits }}</td>
                <td>
                  <span [class.warn]="c.assignedUnits > 0">{{ c.assignedUnits }}</span>
                </td>
                <td class="actions">
                  <button type="button" class="btn-sm" (click)="openLocations(c)">Ver ubicaciones</button>
                  <a class="btn-sm ghost" [routerLink]="['/dotacion/elementos', c.id]">Gestionar</a>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="6">Aún no hay elementos. Crea el primero arriba.</td>
              </tr>
            }
          </tbody>
        </table>
      }

      <app-modal-shell
        [open]="!!locationsFor()"
        [title]="locationsFor() ? 'Ubicaciones — ' + locationsFor()!.name : 'Ubicaciones'"
        (closed)="closeLocations()"
      >
        @if (locationsLoading()) {
          <p>Cargando...</p>
        } @else if (locationsDetail(); as d) {
          <div class="loc-summary">
            <span>Total: {{ d.summary.total }}</span>
            <span>Disponibles: {{ d.summary.available }}</span>
            <span>En puestos: {{ d.summary.assigned }}</span>
          </div>
          @if (d.locations.length === 0) {
            <p class="muted">Ninguna unidad está entregada a un puesto ahora.</p>
          } @else {
            <table class="inner">
              <thead>
                <tr>
                  <th>Unidad</th>
                  <th>Puesto</th>
                </tr>
              </thead>
              <tbody>
                @for (loc of d.locations; track loc.unitId) {
                  <tr>
                    <td>{{ loc.unitCode }}</td>
                    <td>
                      <a [routerLink]="['/dotacion/elementos/puestos']" (click)="closeLocations()">
                        {{ loc.postCode }} — {{ loc.postName }}
                      </a>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        }
      </app-modal-shell>
    </section>
  `,
  styles: `
    .page-head { margin-bottom: 1.25rem; }
    .page-head h2 { margin: 0 0 0.35rem; color: var(--primary-dark); font-size: 1.25rem; }
    .page-head p { margin: 0; color: var(--coraza-text-muted, #64748b); max-width: 42rem; font-size: 0.9rem; }
    .panel {
      margin-bottom: 1.25rem;
      padding: 1rem 1.1rem;
      border: 1px solid var(--coraza-border);
      border-radius: 10px;
      background: var(--coraza-surface, #fff);
    }
    .panel h3 { margin: 0 0 0.35rem; font-size: 1rem; color: var(--primary-dark); }
    .hint { margin: 0 0 0.75rem; font-size: 0.82rem; color: var(--coraza-text-muted, #64748b); }
    .form {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 0.75rem;
      align-items: end;
    }
    .form .wide { grid-column: 1 / -1; }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      font-size: 0.85rem;
      color: var(--coraza-text-muted, #64748b);
    }
    input {
      padding: 0.5rem 0.65rem;
      border: 1px solid var(--coraza-border);
      border-radius: 8px;
      font: inherit;
    }
    .btn {
      padding: 0.5rem 0.95rem;
      border-radius: 8px;
      border: 1px solid var(--primary);
      background: var(--primary);
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .kpis {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      margin-bottom: 1rem;
    }
    .kpis div {
      min-width: 5.5rem;
      padding: 0.55rem 0.8rem;
      border-radius: 10px;
      border: 1px solid var(--coraza-border);
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .kpis strong { font-size: 1.15rem; color: var(--primary-dark); }
    .kpis span { font-size: 0.72rem; color: #64748b; }
    .kpis .warn { background: color-mix(in srgb, #f59e0b 12%, #fff); border-color: #fde68a; }
    .kpis .warn strong { color: #b45309; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--coraza-surface);
      border: 1px solid var(--coraza-border);
      border-radius: 10px;
      overflow: hidden;
    }
    th, td {
      padding: 0.7rem 0.85rem;
      border-bottom: 1px solid var(--coraza-border);
      text-align: left;
      vertical-align: middle;
    }
    th {
      background: var(--primary-50);
      font-size: 0.72rem;
      text-transform: uppercase;
      color: var(--primary-dark);
    }
    .meta, .muted { font-size: 0.78rem; color: var(--coraza-text-muted, #64748b); }
    .warn { color: #b45309; font-weight: 700; }
    .actions { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .btn-sm, a.btn-sm {
      padding: 0.3rem 0.65rem;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--coraza-border));
      background: color-mix(in srgb, var(--primary) 8%, #fff);
      color: var(--primary-dark);
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }
    a.btn-sm.ghost, .btn-sm.ghost {
      background: #fff;
      border-color: var(--coraza-border);
      color: #475569;
    }
    .loc-summary {
      display: flex;
      gap: 1rem;
      margin-bottom: 0.85rem;
      font-size: 0.85rem;
      color: #475569;
    }
    table.inner { margin-top: 0.5rem; }
    .error { color: var(--coraza-error); }
  `,
})
export class PostEquipmentCatalog implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(PostEquipmentApiService);

  readonly catalog = signal<PostEquipmentCatalogItem[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);
  readonly locationsFor = signal<PostEquipmentCatalogItem | null>(null);
  readonly locationsDetail = signal<PostEquipmentCatalogDetail | null>(null);
  readonly locationsLoading = signal(false);

  readonly totals = computed(() => {
    const rows = this.catalog();
    return {
      types: rows.length,
      total: rows.reduce((s, r) => s + r.totalUnits, 0),
      available: rows.reduce((s, r) => s + r.availableUnits, 0),
      assigned: rows.reduce((s, r) => s + r.assignedUnits, 0),
    };
  });

  form = {
    code: '',
    name: '',
    description: '',
    category: '',
    brand: '',
    model: '',
    color: '',
    approximateValue: '' as string | number,
    specs: '',
    initialQuantity: 0,
  };

  ngOnInit(): void {
    this.reload();
  }

  specLine(c: PostEquipmentCatalogItem): string {
    return [c.brand, c.model, c.color].filter((v): v is string => Boolean(v)).join(' · ');
  }

  createType(): void {
    if (!this.form.code.trim() || !this.form.name.trim()) {
      this.formError.set('Código y nombre son obligatorios');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);

    const payload: Record<string, unknown> = {
      code: this.form.code.trim(),
      name: this.form.name.trim(),
    };
    if (this.form.description.trim()) payload['description'] = this.form.description.trim();
    if (this.form.category.trim()) payload['category'] = this.form.category.trim();
    if (this.form.brand.trim()) payload['brand'] = this.form.brand.trim();
    if (this.form.model.trim()) payload['model'] = this.form.model.trim();
    if (this.form.color.trim()) payload['color'] = this.form.color.trim();
    if (this.form.specs.trim()) payload['specs'] = this.form.specs.trim();
    const value = Number(this.form.approximateValue);
    if (!Number.isNaN(value) && this.form.approximateValue !== '' && value >= 0) {
      payload['approximateValue'] = value;
    }
    const qty = Number(this.form.initialQuantity) || 0;
    if (qty > 0) payload['initialQuantity'] = qty;

    this.api.createCatalog(payload as never).subscribe({
      next: () => {
        this.form = {
          code: '',
          name: '',
          description: '',
          category: '',
          brand: '',
          model: '',
          color: '',
          approximateValue: '',
          specs: '',
          initialQuantity: 0,
        };
        this.saving.set(false);
        this.reload();
      },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.message ?? 'No se pudo crear el elemento');
      },
    });
  }

  openLocations(item: PostEquipmentCatalogItem): void {
    this.locationsFor.set(item);
    this.locationsDetail.set(null);
    this.locationsLoading.set(true);
    this.api.getCatalogDetail(item.id).subscribe({
      next: (detail) => {
        this.locationsDetail.set(detail);
        this.locationsLoading.set(false);
      },
      error: () => {
        this.locationsLoading.set(false);
        this.locationsDetail.set(null);
      },
    });
  }

  closeLocations(): void {
    this.locationsFor.set(null);
    this.locationsDetail.set(null);
  }

  private reload(): void {
    this.loading.set(true);
    this.api.listCatalog().subscribe({
      next: (items) => {
        this.catalog.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el catálogo');
      },
    });
  }
}
