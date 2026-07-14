import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { InventoryApiService, WithoutDotacionRow } from '../inventory-api.service';

@Component({
  selector: 'app-dotacion-sin-dotacion',
  imports: [DatePipe, RouterLink],
  template: `
    <div class="dot-page">
      <header class="dot-dash-panel__head">
        <div>
          <h2 style="margin:0;font-size:1.1rem">Sin dotación 7+ meses</h2>
          <p class="dot-muted" style="margin:0.35rem 0 0">
            Asociados en estado ACTIVO o VACACIONES (RRHH) sin entrega confirmada en los últimos {{ months() }} meses.
          </p>
        </div>
        @if (auth.hasPermission('deliveries.create')) {
          <a routerLink="/dotacion/asociados" class="hr-btn hr-btn-primary">Ir a asociados</a>
        }
      </header>

      <div class="dot-filter-bar">
        <label>
          Meses sin dotación
          <select [value]="months()" (change)="onMonthsChange($event)">
            <option [value]="6">6 meses</option>
            <option [value]="7">7 meses</option>
            <option [value]="12">12 meses</option>
          </select>
        </label>
        <span class="dot-muted">{{ rows().length }} asociado(s)</span>
      </div>

      @if (loading()) {
        <div class="dot-skeleton" style="height:240px"></div>
      } @else if (error()) {
        <div class="dot-error">{{ error() }}</div>
      } @else {
        <div class="dot-dash-panel" style="padding:0">
          <div class="dot-table-wrap">
            <table class="dot-table">
              <thead>
                <tr>
                  <th>Documento</th>
                  <th>Nombre</th>
                  <th>Estado</th>
                  <th>Cargo</th>
                  <th>Centro</th>
                  <th>Última entrega</th>
                  <th>Meses</th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.id) {
                  <tr>
                    <td>{{ row.documentNumber }}</td>
                    <td>{{ row.fullName }}</td>
                    <td>{{ row.status }}</td>
                    <td>{{ row.jobPositionName ?? '—' }}</td>
                    <td>{{ row.workCenterCode ?? '—' }}</td>
                    <td>
                      @if (row.lastDeliveryDate) {
                        {{ row.lastDeliveryDate | date: 'mediumDate' }}
                      } @else {
                        <span class="dot-badge dot-badge--never">Nunca</span>
                      }
                    </td>
                    <td>
                      @if (row.monthsSinceDelivery !== null) {
                        {{ row.monthsSinceDelivery }}
                      } @else {
                        —
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="7" class="dot-empty">
                      Todos los asociados activos tienen entrega reciente (menos de {{ months() }} meses).
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  `,
})
export class DotacionSinDotacion implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(InventoryApiService);

  readonly months = signal(7);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly rows = signal<WithoutDotacionRow[]>([]);

  ngOnInit(): void {
    this.load();
  }

  onMonthsChange(event: Event): void {
    const value = parseInt((event.target as HTMLSelectElement).value, 10);
    this.months.set(Number.isFinite(value) ? value : 7);
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.listWithoutDotacion(this.months()).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'No se pudo cargar el listado.');
        this.loading.set(false);
      },
    });
  }
}
