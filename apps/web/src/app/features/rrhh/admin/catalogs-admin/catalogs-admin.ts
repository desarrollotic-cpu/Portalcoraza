import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { HrPageHeader } from '../../../../shared/components/hr-page-header/hr-page-header';
import { ToastService } from '../../../../shared/services/toast.service';
import { HrApiService } from '../../services/hr-api.service';
import type { CatalogKind, CatalogValue } from '../../services/hr.types';

const CATALOG_LABELS: Record<CatalogKind, string> = {
  EPS: 'EPS',
  FONDO_PENSION: 'Fondo de pensión',
  RH: 'Grupo sanguíneo',
  GENERO: 'Género',
  ORIENTACION_SEXUAL: 'Orientación sexual (sensible)',
  RELIGION: 'Religión (sensible)',
  RAZA: 'Raza / etnia (sensible)',
  MOTIVO_RETIRO: 'Motivo de retiro',
  RAZON_RETIRO: 'Razón / causa',
  MEDIO_TRANSPORTE: 'Medio de transporte',
  TIEMPO_TRASLADO: 'Tiempo de traslado',
  TIPO_VIVIENDA: 'Tipo de vivienda',
  NIVEL_ESTUDIO: 'Nivel de estudio',
  RANGO_INGRESOS: 'Rango de ingresos',
};

/**
 * Administración de catálogos maestros (EPS, fondos, RH, motivos de retiro,
 * etc.). Se agrupan por `kind` y permite alternar `isActive` (soft delete).
 */
@Component({
  selector: 'app-catalogs-admin',
  imports: [CommonModule, FormsModule, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header
        title="Catálogos maestros"
        subtitle="Valores compartidos de EPS, fondos, motivos de retiro, etc."
      />

      <div class="hr-admin-layout">
        <aside class="hr-admin-nav">
          @for (kind of kinds; track kind) {
            <button
              type="button"
              class="hr-admin-nav__item"
              [class.active]="selectedKind() === kind"
              (click)="select(kind)"
            >
              {{ label(kind) }}
              <span class="hr-admin-nav__count">{{ countFor(kind) }}</span>
            </button>
          }
        </aside>

        <section class="hr-admin-panel">
          <div class="hr-admin-panel__header">
            <h3>{{ label(selectedKind()) }}</h3>
            @if (auth.hasPermission('catalogs.manage')) {
              <div class="hr-admin-add-row">
                <input
                  type="text"
                  placeholder="Nuevo valor..."
                  [(ngModel)]="newValue"
                  (keyup.enter)="addValue()"
                />
                <button type="button" class="hr-btn hr-btn-primary" (click)="addValue()">Agregar</button>
              </div>
            }
          </div>

          <ul class="hr-value-list">
            @for (v of currentValues(); track v.id) {
              <li class="hr-value-item" [class.disabled]="!v.isActive">
                <span>{{ v.value }}</span>
                @if (auth.hasPermission('catalogs.manage')) {
                  <button type="button" class="hr-btn-toggle" (click)="toggle(v)">
                    {{ v.isActive ? 'Desactivar' : 'Activar' }}
                  </button>
                }
              </li>
            } @empty {
              <li class="hr-empty">Sin valores en este catálogo.</li>
            }
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class CatalogsAdmin implements OnInit {
  private readonly api = inject(HrApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly kinds = Object.keys(CATALOG_LABELS) as CatalogKind[];
  readonly all = signal<Record<CatalogKind, CatalogValue[]>>({} as Record<CatalogKind, CatalogValue[]>);
  readonly selectedKind = signal<CatalogKind>('EPS');
  newValue = '';

  readonly currentValues = computed(() => this.all()[this.selectedKind()] ?? []);

  ngOnInit(): void { this.load(); }

  load(): void {
    this.api.listAllCatalogs().subscribe({ next: (rows) => this.all.set(rows) });
  }

  select(kind: CatalogKind): void {
    this.selectedKind.set(kind);
    this.newValue = '';
  }

  label(kind: CatalogKind): string {
    return CATALOG_LABELS[kind];
  }

  countFor(kind: CatalogKind): number {
    return (this.all()[kind] ?? []).length;
  }

  addValue(): void {
    const v = this.newValue.trim();
    if (!v) return;
    this.api
      .createCatalogValue({ kind: this.selectedKind(), value: v })
      .subscribe({
        next: () => {
          this.newValue = '';
          this.toast.success('Valor agregado');
          this.load();
        },
        error: (err) =>
          this.toast.error('No se pudo crear el valor', err.error?.message ?? undefined),
      });
  }

  toggle(v: CatalogValue): void {
    this.api.toggleCatalogValue(v.id).subscribe({
      next: () => {
        this.toast.info(v.isActive ? 'Valor desactivado' : 'Valor activado');
        this.load();
      },
      error: () => this.toast.error('No se pudo cambiar el estado'),
    });
  }
}
