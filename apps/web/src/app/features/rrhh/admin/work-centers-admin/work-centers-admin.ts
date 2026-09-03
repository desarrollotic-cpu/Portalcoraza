import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { HrPageHeader } from '../../../../shared/components/hr-page-header/hr-page-header';
import { HrApiService } from '../../services/hr-api.service';
import type { WorkCenter } from '../../services/hr.types';

/**
 * Centros de trabajo (puestos / clientes) — solo consulta.
 * El alta de puestos operativos la hace Recepción.
 */
@Component({
  selector: 'app-work-centers-admin',
  imports: [CommonModule, HrPageHeader],
  template: `
    <div class="hr-page">
      <app-hr-page-header title="Centros de trabajo (puestos)">
      </app-hr-page-header>
      <p class="hr-muted sync-hint">
        Los <strong>centros de trabajo RRHH</strong> se sincronizan a Programación/Dotación.
        El alta de puestos operativos la hace <strong>Recepción</strong>. Esta pantalla es consulta.
        Dotación no crea puestos: solo entrega elementos.
      </p>

      <div class="hr-table-wrap">
        <table class="hr-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Zona</th>
              <th>Dirección</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            @for (wc of centers(); track wc.id) {
              <tr [class.dim]="!wc.isActive">
                <td><span class="hr-code-badge">{{ wc.code }}</span></td>
                <td><strong>{{ wc.clientName }}</strong></td>
                <td>{{ wc.zone ?? '—' }}</td>
                <td>{{ wc.address ?? '—' }}</td>
                <td>{{ wc.isActive ? 'Activo' : 'Inactivo' }}</td>
              </tr>
            } @empty {
              <tr><td colspan="5" class="empty-cell">Sin puestos configurados</td></tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: `
    .dim { opacity: 0.55; }
  `,
})
export class WorkCentersAdmin implements OnInit {
  private readonly api = inject(HrApiService);
  readonly centers = signal<WorkCenter[]>([]);

  ngOnInit(): void {
    this.api.listWorkCenters(true).subscribe({ next: (rows) => this.centers.set(rows) });
  }
}
