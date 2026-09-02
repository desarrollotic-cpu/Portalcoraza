import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { HrPageHeader } from '../../../../shared/components/hr-page-header/hr-page-header';
import { HrApiService } from '../../services/hr-api.service';
import type { JobPosition } from '../../services/hr.types';

/**
 * Visualizador de cargos — SOLO LECTURA.
 * La creación, edición y eliminación están deshabilitadas por política.
 * Para cambios en cargos, contactar al administrador del sistema.
 */
@Component({
  selector: 'app-job-positions-admin',
  imports: [CommonModule, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header
        title="Cargos"
        subtitle="Visualización de cargos · Solo lectura"
      />

      <div class="hr-table-wrap">
        @if (loading()) {
          <div class="hr-loading">Cargando cargos...</div>
        } @else {
          <table class="hr-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Crítico</th>
                <th>Frecuencia</th>
                <th>Activo</th>
              </tr>
            </thead>
            <tbody>
              @for (p of positions(); track p.id) {
                <tr [class.dim]="!p.isActive">
                  <td>
                    <strong>{{ p.name }}</strong>
                    @if (p.description) { <div class="desc">{{ p.description }}</div> }
                  </td>
                  <td>
                    @if (p.isCritical) {
                      <span class="hr-pill hr-pill-critical">Crítico</span>
                    } @else {
                      <span class="hr-pill">Regular</span>
                    }
                  </td>
                  <td>{{ p.refreshFrequencyYears }} año(s)</td>
                  <td>{{ p.isActive ? '✓' : '—' }}</td>
                </tr>
              } @empty {
                <tr><td colspan="4" class="empty-cell">Sin cargos configurados</td></tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
})
export class JobPositionsAdmin implements OnInit {
  private readonly api = inject(HrApiService);

  readonly positions = signal<JobPosition[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.api.listJobPositions().subscribe({
      next: (rows) => {
        this.positions.set(rows);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
