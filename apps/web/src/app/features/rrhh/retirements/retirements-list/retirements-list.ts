import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HrPageHeader } from '../../../../shared/components/hr-page-header/hr-page-header';
import { HrApiService } from '../../services/hr-api.service';
import type { Retirement } from '../../services/hr.types';

/**
 * Listado de retiros. Muestra los retiros registrados con paginación.
 */
@Component({
  selector: 'app-retirements-list',
  imports: [CommonModule, RouterLink, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header
        title="Retiros registrados"
        [badge]="rangeLabel()"
      />

      @if (loading()) {
        <p class="hr-loading">Cargando...</p>
      } @else if (total() === 0) {
        <p class="hr-empty">Aún no hay retiros registrados.</p>
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

  load(): void {
    this.loading.set(true);
    this.api.listRetirements(undefined, undefined, this.page(), this.limit).subscribe({
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
