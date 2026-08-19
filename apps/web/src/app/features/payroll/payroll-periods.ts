import { CurrencyPipe, DatePipe, CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PayrollPeriod, PayrollSlip, PayrollService } from './payroll.service';

@Component({
  selector: 'app-payroll-periods',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div>
          <h1>Nómina & Colillas de Pago</h1>
          <p class="subtitle">Liquidación de salarios, recargos nocturnos y emisión de colillas de pago</p>
        </div>
        <button class="btn btn-primary" (click)="showNewPeriodModal.set(true)">
          + Nuevo Periodo
        </button>
      </header>

      <div class="card-grid">
        @for (p of periods(); track p.id) {
          <div class="card period-card" [class.active]="selectedPeriod()?.id === p.id">
            <div class="badge" [class.badge-success]="p.status === 'LIQUIDADO'" [class.badge-warning]="p.status === 'BORRADOR'">
              {{ p.status }}
            </div>
            <h3>{{ p.periodName }}</h3>
            <p class="dates">
              📅 {{ p.startDate | date: 'shortDate' }} — {{ p.endDate | date: 'shortDate' }}
            </p>

            <div class="actions">
              <button class="btn btn-sm btn-outline" (click)="selectPeriod(p)">
                Ver Colillas
              </button>

              @if (p.status === 'BORRADOR') {
                <button class="btn btn-sm btn-primary" (click)="calculate(p.id)" [disabled]="calculating()">
                  {{ calculating() ? 'Calculando...' : '⚡ Liquidar Nómina' }}
                </button>
              }
            </div>
          </div>
        } @empty {
          <div class="empty-state">
            <p>No hay periodos de nómina creados aún.</p>
          </div>
        }
      </div>

      <!-- SECCIÓN DE COLILLAS DEL PERIODO SELECCIONADO -->
      @if (selectedPeriod()) {
        <section class="slips-section card">
          <div class="section-header">
            <h2>Colillas del Periodo: {{ selectedPeriod()?.periodName }}</h2>
            <span class="count">{{ slips().length }} Asociados</span>
          </div>

          <table class="data-table">
            <thead>
              <tr>
                <th>Asociado</th>
                <th>Cédula</th>
                <th>Días</th>
                <th>Básico</th>
                <th>Aux. Transp.</th>
                <th>Recargos Noche</th>
                <th>Devengado</th>
                <th>Deducciones</th>
                <th>Neto a Pagar</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              @for (s of slips(); track s.id) {
                <tr>
                  <td><strong>{{ s.associate?.firstName }} {{ s.associate?.firstLastName }}</strong></td>
                  <td>{{ s.associate?.documentNumber }}</td>
                  <td>{{ s.workedDays }}</td>
                  <td>{{ s.basicSalary | currency: 'COP': 'symbol-narrow': '1.0-0' }}</td>
                  <td>{{ s.transportAllowance | currency: 'COP': 'symbol-narrow': '1.0-0' }}</td>
                  <td>{{ s.nightSurcharges | currency: 'COP': 'symbol-narrow': '1.0-0' }}</td>
                  <td class="text-success"><strong>{{ s.totalDevengado | currency: 'COP': 'symbol-narrow': '1.0-0' }}</strong></td>
                  <td class="text-danger">{{ s.totalDeducido | currency: 'COP': 'symbol-narrow': '1.0-0' }}</td>
                  <td class="text-primary"><strong>{{ s.netPay | currency: 'COP': 'symbol-narrow': '1.0-0' }}</strong></td>
                  <td>
                    <button class="btn btn-sm btn-secondary" (click)="viewSlipModal(s)">
                      📄 Ver Colilla PDF
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="10" class="text-center">Presione "Liquidar Nómina" para generar las colillas.</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }

      <!-- MODAL CREAR PERIODO -->
      @if (showNewPeriodModal()) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <h3>Nuevo Periodo de Nómina</h3>
            <form (ngSubmit)="createPeriod()">
              <label>Nombre del Periodo *
                <input type="text" [(ngModel)]="newPeriodName" name="pName" placeholder="Ej. Quincena 1 - Agosto 2026" required />
              </label>
              <div class="row">
                <label>Fecha Inicio *
                  <input type="date" [(ngModel)]="newStartDate" name="sDate" required />
                </label>
                <label>Fecha Fin *
                  <input type="date" [(ngModel)]="newEndDate" name="eDate" required />
                </label>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-outline" (click)="showNewPeriodModal.set(false)">Cancelar</button>
                <button type="submit" class="btn btn-primary">Crear Periodo</button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- MODAL VISOR COLILLA -->
      @if (activeSlip()) {
        <div class="modal-backdrop">
          <div class="modal-card slip-modal">
            <div class="slip-header">
              <h2>CORAZA SEGURIDAD CTA</h2>
              <p>COLILLA DE PAGO DE NÓMINA</p>
            </div>
            <div class="slip-meta">
              <p><strong>Empleado:</strong> {{ activeSlip()?.associate?.firstName }} {{ activeSlip()?.associate?.firstLastName }}</p>
              <p><strong>Cédula:</strong> {{ activeSlip()?.associate?.documentNumber }}</p>
              <p><strong>Días Laborados:</strong> {{ activeSlip()?.workedDays }}</p>
            </div>
            <hr />
            <table class="slip-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th>Horas</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                @for (d of activeSlip()?.details; track d.id) {
                  <tr>
                    <td>{{ d.conceptName }}</td>
                    <td><span [class.badge-green]="d.type==='DEVENGADO'" [class.badge-red]="d.type==='DEDUCCION'">{{ d.type }}</span></td>
                    <td>{{ d.hours }}</td>
                    <td>{{ d.amount | currency: 'COP': 'symbol-narrow': '1.0-0' }}</td>
                  </tr>
                }
              </tbody>
            </table>
            <div class="slip-totals">
              <p><strong>Total Devengado:</strong> {{ activeSlip()?.totalDevengado | currency: 'COP': 'symbol-narrow': '1.0-0' }}</p>
              <p><strong>Total Deducciones:</strong> {{ activeSlip()?.totalDeducido | currency: 'COP': 'symbol-narrow': '1.0-0' }}</p>
              <p class="net-highlight"><strong>NETO A PAGAR:</strong> {{ activeSlip()?.netPay | currency: 'COP': 'symbol-narrow': '1.0-0' }}</p>
            </div>
            <div class="modal-actions">
              <button class="btn btn-outline" (click)="activeSlip.set(null)">Cerrar</button>
              <button class="btn btn-primary" (click)="printSlip()">🖨️ Imprimir / Guardar PDF</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 1.5rem; max-width: 1300px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .period-card { padding: 1.25rem; background: var(--bg-card, #ffffff); border-radius: 8px; border: 1px solid #e2e8f0; position: relative; }
    .period-card.active { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2); }
    .badge { display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-green { color: #166534; }
    .badge-red { color: #991b1b; }
    .actions { display: flex; gap: 0.5rem; margin-top: 1rem; }
    .slips-section { padding: 1.5rem; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; }
    .data-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    .data-table th, .data-table td { padding: 0.75rem; border-bottom: 1px solid #e2e8f0; text-align: left; }
    .text-success { color: #16a34a; }
    .text-danger { color: #dc2626; }
    .text-primary { color: #2563eb; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
    .modal-card { background: #fff; padding: 1.5rem; border-radius: 8px; width: 100%; max-width: 500px; }
    .slip-modal { max-width: 650px; }
    .slip-header { text-align: center; font-weight: bold; margin-bottom: 1rem; }
    .slip-table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    .slip-table th, .slip-table td { padding: 0.5rem; border-bottom: 1px solid #cbd5e1; }
    .slip-totals { display: flex; justify-content: space-between; margin-top: 1rem; font-size: 1.1rem; }
    .net-highlight { color: #2563eb; font-size: 1.2rem; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1.5rem; }
  `]
})
export class PayrollPeriodsComponent implements OnInit {
  private payrollService = inject(PayrollService);

  periods = signal<PayrollPeriod[]>([]);
  selectedPeriod = signal<PayrollPeriod | null>(null);
  slips = signal<PayrollSlip[]>([]);
  activeSlip = signal<PayrollSlip | null>(null);

  showNewPeriodModal = signal(false);
  calculating = signal(false);

  newPeriodName = '';
  newStartDate = '';
  newEndDate = '';

  ngOnInit() {
    this.loadPeriods();
  }

  loadPeriods() {
    this.payrollService.getPeriods().subscribe((list) => {
      this.periods.set(list);
      if (list.length > 0 && !this.selectedPeriod()) {
        this.selectPeriod(list[0]);
      }
    });
  }

  selectPeriod(p: PayrollPeriod) {
    this.selectedPeriod.set(p);
    this.payrollService.getSlipsByPeriod(p.id).subscribe((slipsList) => {
      this.slips.set(slipsList);
    });
  }

  createPeriod() {
    if (!this.newPeriodName || !this.newStartDate || !this.newEndDate) return;
    this.payrollService.createPeriod({
      periodName: this.newPeriodName,
      startDate: this.newStartDate,
      endDate: this.newEndDate,
    }).subscribe(() => {
      this.showNewPeriodModal.set(false);
      this.loadPeriods();
    });
  }

  calculate(periodId: string) {
    this.calculating.set(true);
    this.payrollService.calculatePeriod(periodId).subscribe({
      next: (updated) => {
        this.calculating.set(false);
        this.selectPeriod(updated);
        this.loadPeriods();
      },
      error: () => this.calculating.set(false),
    });
  }

  viewSlipModal(s: PayrollSlip) {
    this.activeSlip.set(s);
  }

  printSlip() {
    window.print();
  }
}
