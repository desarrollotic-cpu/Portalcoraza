import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HrPageHeader } from '../../../../shared/components/hr-page-header/hr-page-header';
import { HrApiService } from '../../services/hr-api.service';
import type { Retirement } from '../../services/hr.types';

/**
 * Listado de retiros. Muestra todos los retiros registrados con posibilidad
 * de filtrar por rango de fechas y ver detalles del asociado.
 */
@Component({
  selector: 'app-retirements-list',
  imports: [CommonModule, RouterLink, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header
        title="Retiros registrados"
        [badge]="retirements().length + ' en total'"
      />

      @if (loading()) {
        <p class="hr-loading">Cargando...</p>
      } @else if (retirements().length === 0) {
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
      }
    </div>
  `,
})
export class RetirementsList implements OnInit {
  private readonly api = inject(HrApiService);
  readonly retirements = signal<Retirement[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.api.listRetirements().subscribe({
      next: (rows) => {
        this.retirements.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
