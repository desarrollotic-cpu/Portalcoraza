import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  PostEquipmentApiService,
  PostEquipmentCatalogDetail as CatalogDetail,
} from '../post-equipment-api.service';
import { PostEquipmentTabs } from '../post-equipment-tabs/post-equipment-tabs';

@Component({
  selector: 'app-post-equipment-catalog-detail',
  imports: [FormsModule, RouterLink, PostEquipmentTabs],
  template: `
    <section>
      <app-post-equipment-tabs />
      <a class="back" routerLink="/dotacion/elementos">← Volver al inventario</a>

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else if (detail(); as d) {
        <header class="page-head">
          <div>
            <span class="code">{{ d.catalog.code }}</span>
            <h2>{{ d.catalog.name }}</h2>
            @if (d.catalog.description) {
              <p>{{ d.catalog.description }}</p>
            }
            @if (metaLine(d); as meta) {
              <p class="meta">{{ meta }}</p>
            }
            @if (d.catalog.specs) {
              <p class="meta">{{ d.catalog.specs }}</p>
            }
          </div>
          <div class="stats">
            <div><strong>{{ d.summary.total }}</strong><span>total</span></div>
            <div><strong>{{ d.summary.available }}</strong><span>libres</span></div>
            <div class="warn"><strong>{{ d.summary.assigned }}</strong><span>en puestos</span></div>
          </div>
        </header>

        @if (auth.hasPermission('post_equipment.manage')) {
          <div class="panel">
            <h3>Agregar unidades</h3>
            <p class="hint">
              Ejemplo: si Coraza tiene 10 hornos, agrega 10 unidades. Se numeran solos
              ({{ d.catalog.code }}-01, {{ d.catalog.code }}-02…).
            </p>
            <form class="form" (ngSubmit)="addUnits()">
              <label>
                Cantidad a crear
                <input type="number" min="1" max="200" [(ngModel)]="qty" name="qty" />
              </label>
              <label>
                Prefijo de código
                <input [(ngModel)]="prefix" name="prefix" [placeholder]="d.catalog.code" />
              </label>
              <button type="submit" class="btn" [disabled]="saving()">Agregar</button>
            </form>
            @if (formError()) {
              <p class="error">{{ formError() }}</p>
            }
          </div>
        }

        <h3 class="section-title">Dónde está cada unidad</h3>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Estado</th>
              <th>Puesto actual</th>
            </tr>
          </thead>
          <tbody>
            @for (u of d.units; track u.id) {
              <tr>
                <td><strong>{{ u.unitCode }}</strong></td>
                <td>{{ statusLabel(u.status) }}</td>
                <td>
                  @if (u.currentPostId) {
                    <a [routerLink]="['/dotacion/elementos/puestos', u.currentPostId]">
                      {{ u.currentPostCode }} — {{ u.currentPostName }}
                    </a>
                  } @else {
                    <span class="muted">Sin asignar</span>
                  }
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="3">Todavía no hay unidades. Agrégalas arriba.</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: `
    .back {
      display: inline-block;
      margin-bottom: 0.85rem;
      color: var(--primary);
      text-decoration: none;
      font-size: 0.9rem;
    }
    .page-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
      margin-bottom: 1.25rem;
    }
    .code {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--primary);
    }
    .page-head h2 { margin: 0.15rem 0; color: var(--primary-dark); }
    .page-head p { margin: 0; color: var(--coraza-text-muted, #64748b); }
    .page-head .meta { margin-top: 0.35rem; font-size: 0.85rem; }
    .stats { display: flex; gap: 0.75rem; }
    .stats div {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 4.5rem;
      padding: 0.5rem 0.75rem;
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid var(--coraza-border);
    }
    .stats strong { font-size: 1.2rem; color: var(--primary-dark); }
    .stats span { font-size: 0.72rem; color: var(--coraza-text-muted, #64748b); }
    .stats .warn { background: color-mix(in srgb, #f59e0b 12%, #fff); border-color: #fde68a; }
    .stats .warn strong { color: #b45309; }
    .panel {
      margin-bottom: 1.25rem;
      padding: 1rem 1.1rem;
      border: 1px solid var(--coraza-border);
      border-radius: 10px;
      background: var(--coraza-surface, #fff);
    }
    .panel h3, .section-title {
      margin: 0 0 0.5rem;
      font-size: 1rem;
      color: var(--primary-dark);
    }
    .hint { margin: 0 0 0.75rem; font-size: 0.85rem; color: var(--coraza-text-muted, #64748b); }
    .form {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 0.75rem;
      align-items: end;
    }
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
    .btn:disabled { opacity: 0.55; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--coraza-surface);
      border: 1px solid var(--coraza-border);
      border-radius: 10px;
      overflow: hidden;
    }
    th, td {
      padding: 0.65rem 0.8rem;
      border-bottom: 1px solid var(--coraza-border);
      text-align: left;
    }
    th {
      background: var(--primary-50);
      font-size: 0.72rem;
      text-transform: uppercase;
      color: var(--primary-dark);
    }
    a { color: var(--primary); text-decoration: none; font-weight: 600; }
    .muted { color: var(--coraza-text-muted, #64748b); }
    .error { color: var(--coraza-error); }
  `,
})
export class PostEquipmentCatalogDetailPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(PostEquipmentApiService);
  private readonly route = inject(ActivatedRoute);

  readonly detail = signal<CatalogDetail | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly formError = signal<string | null>(null);

  qty = 1;
  prefix = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Elemento no válido');
      this.loading.set(false);
      return;
    }
    this.reload(id);
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'AVAILABLE':
        return 'Disponible';
      case 'ASSIGNED':
        return 'En puesto';
      case 'LOST':
        return 'Perdido';
      case 'WRITTEN_OFF':
        return 'Baja';
      default:
        return status;
    }
  }

  metaLine(d: CatalogDetail): string {
    const c = d.catalog;
    const parts = [c.category, c.brand, c.model, c.color]
      .filter((v): v is string => Boolean(v));
    if (c.approximateValue != null) {
      parts.push(`≈ ${c.approximateValue}`);
    }
    return parts.join(' · ');
  }

  addUnits(): void {
    const id = this.detail()?.catalog.id;
    if (!id) return;
    const quantity = Number(this.qty) || 0;
    if (quantity < 1) {
      this.formError.set('Indica una cantidad válida');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    this.api
      .createUnits({
        catalogId: id,
        quantity,
        codePrefix: this.prefix.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.qty = 1;
          this.saving.set(false);
          this.reload(id);
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(err?.error?.message ?? 'No se pudieron crear las unidades');
        },
      });
  }

  private reload(id: string): void {
    this.api.getCatalogDetail(id).subscribe({
      next: (detail) => {
        this.detail.set(detail);
        if (!this.prefix) this.prefix = detail.catalog.code;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el elemento');
      },
    });
  }
}
