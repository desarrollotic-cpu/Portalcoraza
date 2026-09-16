import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HrPageHeader } from '../../../../shared/components/hr-page-header/hr-page-header';
import { HrApiService } from '../../services/hr-api.service';
import type { Retirement } from '../../services/hr.types';

/** Primer y último día del mes `YYYY-MM`. */
function monthBounds(ym: string): { from: string; to: string } {
  const [y, m] = ym.split('-').map(Number);
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
  return { from, to };
}

/**
 * Listado de retiros. Filtro por mes de retiro + paginación.
 */
@Component({
  selector: 'app-retirements-list',
  imports: [CommonModule, FormsModule, RouterLink, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header
        title="Retiros registrados"
        [badge]="rangeLabel()"
      />

      <section class="hr-filters">
        <label class="hr-filter-month">
          Se retiraron en el mes
          <input type="month" [ngModel]="retirementMonth" (ngModelChange)="setRetirementMonth($event)" />
        </label>
        @if (retirementMonth) {
          <button type="button" class="hr-btn hr-btn-ghost hr-btn-sm" (click)="clearMonthFilter()">
            Ver todos los meses
          </button>
        }
      </section>

      @if (loading()) {
        <p class="hr-loading">Cargando...</p>
      } @else if (total() === 0) {
        <p class="hr-empty">
          {{ retirementMonth ? 'No hay retiros en ese mes.' : 'Aún no hay retiros registrados.' }}
        </p>
      } @else {
        <div class="hr-table-wrap">
          <table class="hr-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Asociado</th>
                <th>Cargo</th>
                <th>Motivo</th>
                <th>Edad</th>
                <th>Liquidación</th>
                <th>¿Volvería?</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (r of retirements(); track r.id) {
                <tr>
                  <td>{{ r.retirementDate }}</td>
                  <td>
                    @if (r.associate) {
                      <a [routerLink]="['/rrhh/asociados', r.associateId]" class="hr-link">
                        {{ r.associate.firstName }} {{ r.associate.firstLastName }}
                      </a>
                    } @else {
                      —
                    }
                  </td>
                  <td>{{ r.lastPosition }}</td>
                  <td>{{ r.reason?.value ?? '—' }}</td>
                  <td>{{ r.ageAtRetirement }}</td>
                  <td>
                    <span class="hr-retirement-badge" [attr.data-status]="r.liquidationStatus">
                      {{ r.liquidationStatus }}
                    </span>
                  </td>
                  <td>{{ r.wouldReturn }}</td>
                  <td>
                    <a [routerLink]="['/rrhh/asociados', r.associateId]" class="hr-link hr-link-sm">Ver</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="hr-pagination">
          <button type="button" class="hr-btn hr-btn-ghost hr-btn-sm" [disabled]="page() <= 1" (click)="goPage(page() - 1)">
            Anterior
          </button>
          <span class="hr-pagination__meta">Página {{ page() }} de {{ totalPages() }}</span>
          <button type="button" class="hr-btn hr-btn-ghost hr-btn-sm" [disabled]="page() >= totalPages()" (click)="goPage(page() + 1)">
            Siguiente
          </button>
        </div>
      }
    </div>
  `,
})
export class RetirementsList implements OnInit {
  private readonly api = inject(HrApiService);
  readonly retirements = signal<Retirement[]>([]);
  readonly loading = signal(true);
  readonly page = signal(1);
  readonly limit = 50;
  readonly total = signal(0);
  readonly totalPages = signal(1);
  retirementMonth = '';

  readonly rangeLabel = computed(() => {
    const total = this.total();
    if (!total) return '0';
    const from = (this.page() - 1) * this.limit + 1;
    const to = Math.min(this.page() * this.limit, total);
    return `${from}–${to} de ${total}`;
  });

  ngOnInit(): void {
    this.load();
  }

  setRetirementMonth(ym: string): void {
    this.retirementMonth = ym ?? '';
    this.page.set(1);
    this.load();
  }

  clearMonthFilter(): void {
    this.retirementMonth = '';
    this.page.set(1);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    let from: string | undefined;
    let to: string | undefined;
    if (this.retirementMonth) {
      const bounds = monthBounds(this.retirementMonth);
      from = bounds.from;
      to = bounds.to;
    }
    this.api.listRetirements(from, to, this.page(), this.limit).subscribe({
      next: (res) => {
        this.retirements.set(res.items);
        this.total.set(res.total);
        this.totalPages.set(res.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  goPage(next: number): void {
    if (next < 1 || next > this.totalPages()) return;
    this.page.set(next);
    this.load();
  }
}
