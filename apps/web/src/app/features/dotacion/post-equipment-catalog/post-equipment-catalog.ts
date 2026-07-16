import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import {
  PostEquipmentApiService,
  PostEquipmentCatalogItem,
} from '../post-equipment-api.service';
import { PostEquipmentTabs } from '../post-equipment-tabs/post-equipment-tabs';

@Component({
  selector: 'app-post-equipment-catalog',
  imports: [FormsModule, RouterLink, PostEquipmentTabs],
  template: `
    <section>
      <app-post-equipment-tabs />

      <header class="page-head">
        <div>
          <h2>Inventario de elementos</h2>
          <p>
            Crea tipos de elementos (sombrillas, sillas, carpas, radios…) y registra cuántas unidades
            tiene Coraza. Luego entrégalas a los puestos desde la pestaña
            <a routerLink="/dotacion/elementos/puestos">Entregar a puestos</a>.
          </p>
        </div>
      </header>

      @if (auth.hasPermission('post_equipment.manage')) {
        <div class="panel">
          <h3>Crear tipo de elemento</h3>
          <form class="form" (ngSubmit)="createType()">
            <label>
              Código
              <input [(ngModel)]="form.code" name="code" placeholder="SOMBRILLA" required />
            </label>
            <label>
              Nombre
              <input [(ngModel)]="form.name" name="name" placeholder="Sombrilla" required />
            </label>
            <label class="wide">
              Descripción
              <input [(ngModel)]="form.description" name="description" />
            </label>
            <button type="submit" class="btn" [disabled]="saving()">Crear elemento</button>
          </form>
          @if (formError()) {
            <p class="error">{{ formError() }}</p>
          }
        </div>
      }

      @if (loading()) {
        <p>Cargando...</p>
      } @else if (error()) {
        <p class="error">{{ error() }}</p>
      } @else {
        <table>
          <thead>
            <tr>
              <th>Elemento</th>
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
                  <div class="meta">{{ c.code }}</div>
                </td>
                <td>{{ c.totalUnits }}</td>
                <td>{{ c.availableUnits }}</td>
                <td>
                  <span [class.warn]="c.assignedUnits > 0">{{ c.assignedUnits }}</span>
                </td>
                <td>
                  <a [routerLink]="['/dotacion/elementos', c.id]">Ver unidades</a>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="5">Aún no hay elementos. Crea el primero arriba.</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </section>
  `,
  styles: `
    .page-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
    }
    .page-head h2 { margin: 0 0 0.35rem; color: var(--primary-dark); font-size: 1.25rem; }
    .page-head p { margin: 0; color: var(--coraza-text-muted, #64748b); max-width: 40rem; font-size: 0.9rem; }
    .page-head a { color: var(--primary); font-weight: 600; }
    .panel {
      margin-bottom: 1.25rem;
      padding: 1rem 1.1rem;
      border: 1px solid var(--coraza-border);
      border-radius: 10px;
      background: var(--coraza-surface, #fff);
    }
    .panel h3 { margin: 0 0 0.75rem; font-size: 1rem; color: var(--primary-dark); }
    .form {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
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
    }
    th {
      background: var(--primary-50);
      font-size: 0.72rem;
      text-transform: uppercase;
      color: var(--primary-dark);
    }
    .meta { font-size: 0.78rem; color: var(--coraza-text-muted, #64748b); }
    .warn { color: #b45309; font-weight: 700; }
    a { color: var(--primary); font-weight: 600; text-decoration: none; }
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

  form = { code: '', name: '', description: '' };

  ngOnInit(): void {
    this.reload();
  }

  createType(): void {
    if (!this.form.code.trim() || !this.form.name.trim()) {
      this.formError.set('Código y nombre son obligatorios');
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    this.api
      .createCatalog({
        code: this.form.code.trim(),
        name: this.form.name.trim(),
        description: this.form.description.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.form = { code: '', name: '', description: '' };
          this.saving.set(false);
          this.reload();
        },
        error: (err) => {
          this.saving.set(false);
          this.formError.set(err?.error?.message ?? 'No se pudo crear el elemento');
        },
      });
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
