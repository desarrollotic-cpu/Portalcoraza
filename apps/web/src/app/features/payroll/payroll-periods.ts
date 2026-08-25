import { CurrencyPipe, DatePipe, CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PayrollPeriod, PayrollSlip, PayrollService } from './payroll.service';

@Component({
  selector: 'app-payroll-periods',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, DatePipe],
  template: `
    <div class="payroll-container">
      <div class="periods-header">
        <div>
          <h3>Periodos de Nómina Oficial</h3>
          <p class="subtitle">Seleccione un periodo para liquidar o consultar las colillas de pago desglosadas.</p>
        </div>
        <button class="btn-create" (click)="showNewPeriodModal.set(true)">
          + Nuevo Periodo
        </button>
      </div>

      <div class="periods-grid">
        @for (p of periods(); track p.id) {
          <div class="period-card" [class.active]="selectedPeriod()?.id === p.id" (click)="selectPeriod(p)">
            <div class="card-top">
              <span class="status-pill" [class.st-liquidado]="p.status === 'LIQUIDADO'" [class.st-borrador]="p.status === 'BORRADOR'">
                {{ p.status === 'LIQUIDADO' ? '🟢 LIQUIDADO' : '🟡 BORRADOR' }}
              </span>
            </div>
            <h4>{{ p.periodName }}</h4>
            <div class="period-dates">
              📅 {{ p.startDate | date: 'mediumDate' }} — {{ p.endDate | date: 'mediumDate' }}
            </div>

            <div class="card-actions" (click)="$event.stopPropagation()">
              <button class="btn-action" [class.btn-selected]="selectedPeriod()?.id === p.id" (click)="selectPeriod(p)">
                👁️ Ver Colillas
              </button>

              @if (p.status === 'BORRADOR') {
                <button class="btn-action btn-calc" (click)="calculate(p.id)" [disabled]="calculating()">
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
        <section class="card slips-section">
          <div class="section-header">
            <div>
              <h3>Colillas de Pago: {{ selectedPeriod()?.periodName }}</h3>
              <p class="subtitle">Liquidación detallada por asociado cruzada con la programación de turnos y recargos.</p>
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem;">
              @if (slips().length > 0) {
                <button class="btn-export-excel" (click)="exportConsolidatedExcel()">
                  📊 Exportar Consolidado (.xls)
                </button>
              }
              <span class="count-badge">{{ slips().length }} Colilla(s) Generada(s)</span>
            </div>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Cédula</th>
                  <th>Nombre del Asociado</th>
                  <th class="th-center">Días</th>
                  <th class="th-num">Básico</th>
                  <th class="th-num">Aux. Transp.</th>
                  <th class="th-num">Recargos Noche / Dom</th>
                  <th class="th-num">Devengado</th>
                  <th class="th-num">Deducciones</th>
                  <th class="th-num">Neto a Pagar</th>
                  <th class="th-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (s of slips(); track s.id) {
                  <tr>
                    <td><code>{{ s.associate?.documentNumber }}</code></td>
                    <td><strong>{{ s.associate?.firstName }} {{ s.associate?.firstLastName }}</strong></td>
                    <td class="td-center">{{ s.workedDays }}</td>
                    <td class="td-num">{{ s.basicSalary | currency: 'COP': 'symbol-narrow': '1.0-0' }}</td>
                    <td class="td-num">{{ s.transportAllowance | currency: 'COP': 'symbol-narrow': '1.0-0' }}</td>
                    <td class="td-num highlight-rec">{{ s.nightSurcharges | currency: 'COP': 'symbol-narrow': '1.0-0' }}</td>
                    <td class="td-num text-success"><strong>{{ s.totalDevengado | currency: 'COP': 'symbol-narrow': '1.0-0' }}</strong></td>
                    <td class="td-num text-danger">{{ s.totalDeducido | currency: 'COP': 'symbol-narrow': '1.0-0' }}</td>
                    <td class="td-num text-primary"><strong>{{ s.netPay | currency: 'COP': 'symbol-narrow': '1.0-0' }}</strong></td>
                    <td class="td-center">
                      <button class="btn-slip" (click)="viewSlipModal(s)">
                        📄 Ver Colilla
                      </button>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="10" class="text-center empty-msg">
                      Este periodo está en borrador. Haga clic en <strong>"⚡ Liquidar Nómina"</strong> para calcular automáticamente los salarios y recargos desde la programación.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      <!-- MODAL CREAR PERIODO -->
      @if (showNewPeriodModal()) {
        <div class="modal-backdrop">
          <div class="modal-card">
            <h3>Nuevo Periodo de Nómina</h3>
            <form (ngSubmit)="createPeriod()">
              <div class="form-group">
                <label>Nombre del Periodo *</label>
                <input type="text" [(ngModel)]="newPeriodName" name="pName" placeholder="Ej. Nómina Mensual Septiembre 2026" required />
              </div>
              <div class="row">
                <div class="form-group">
                  <label>Fecha Inicio *</label>
                  <input type="date" [(ngModel)]="newStartDate" name="sDate" required />
                </div>
                <div class="form-group">
                  <label>Fecha Fin *</label>
                  <input type="date" [(ngModel)]="newEndDate" name="eDate" required />
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="showNewPeriodModal.set(false)">Cancelar</button>
                <button type="submit" class="btn-save">Crear Periodo</button>
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
              <h2>🛡️ CORAZA SEGURIDAD C.T.A.</h2>
              <p class="slip-sub">NIT: 811.021.524-8 · COMPROBANTE INDIVIDUAL DE PAGO DE NÓMINA</p>
            </div>
            <div class="slip-meta-grid">
              <div><strong>Asociado:</strong> {{ activeSlip()?.associate?.firstName }} {{ activeSlip()?.associate?.firstLastName }}</div>
              <div><strong>Cédula:</strong> {{ activeSlip()?.associate?.documentNumber }}</div>
              <div><strong>Periodo:</strong> {{ selectedPeriod()?.periodName }}</div>
              <div><strong>Días Laborados:</strong> {{ activeSlip()?.workedDays }} días</div>
            </div>
            <div class="table-wrap">
              <table class="slip-table">
                <thead>
                  <tr>
                    <th>Concepto</th>
                    <th>Tipo</th>
                    <th class="th-center">Horas</th>
                    <th class="th-num">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  @for (d of activeSlip()?.details; track d.id) {
                    <tr>
                      <td>{{ d.conceptName }}</td>
                      <td><span [class.badge-green]="d.type==='DEVENGADO'" [class.badge-red]="d.type==='DEDUCCION'">{{ d.type }}</span></td>
                      <td class="td-center">{{ d.hours }}</td>
                      <td class="td-num">{{ d.amount | currency: 'COP': 'symbol-narrow': '1.0-0' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <div class="slip-totals-box">
              <div><span>Total Devengado:</span> <strong>{{ activeSlip()?.totalDevengado | currency: 'COP': 'symbol-narrow': '1.0-0' }}</strong></div>
              <div><span>Total Deducciones:</span> <strong class="text-danger">{{ activeSlip()?.totalDeducido | currency: 'COP': 'symbol-narrow': '1.0-0' }}</strong></div>
              <div class="net-highlight"><span>NETO A PAGAR:</span> <strong>{{ activeSlip()?.netPay | currency: 'COP': 'symbol-narrow': '1.0-0' }}</strong></div>
            </div>
            <div class="modal-actions">
              <button class="btn-cancel" (click)="activeSlip.set(null)">Cerrar</button>
              <button class="btn-save" (click)="printSlip()">🖨️ Imprimir Colilla</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .payroll-container { display: flex; flex-direction: column; gap: 1.25rem; }
    .periods-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; }
    .periods-header h3 { margin: 0 0 0.2rem; font-size: 1.1rem; font-weight: 700; color: #0f172a; }
    .subtitle { margin: 0; color: #64748b; font-size: 0.85rem; }
    .btn-create {
      background: #0f766e; color: #fff; border: none; padding: 0.45rem 0.95rem; border-radius: 0.5rem;
      font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: background 0.15s;
    }
    .btn-create:hover { background: #0d9488; }
    .periods-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 1rem; }
    .period-card {
      padding: 1.15rem; background: #ffffff; border-radius: 0.75rem; border: 1.5px solid #e2e8f0;
      cursor: pointer; transition: all 0.15s ease; display: flex; flex-direction: column; gap: 0.5rem;
    }
    .period-card:hover { border-color: #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .period-card.active { border-color: #0f766e; background: #f0fdfa; box-shadow: 0 0 0 2px rgba(15, 118, 110, 0.2); }
    .card-top { display: flex; justify-content: space-between; align-items: center; }
    .status-pill { font-size: 0.72rem; font-weight: 800; padding: 0.2rem 0.55rem; border-radius: 999px; }
    .st-liquidado { background: #dcfce7; color: #166534; }
    .st-borrador { background: #fef3c7; color: #92400e; }
    .period-card h4 { margin: 0; font-size: 1rem; font-weight: 700; color: #0f172a; }
    .period-dates { font-size: 0.82rem; color: #64748b; font-weight: 500; }
    .card-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
    .btn-action {
      flex: 1; padding: 0.35rem 0.65rem; border-radius: 0.4rem; border: 1px solid #cbd5e1;
      background: #ffffff; font-size: 0.78rem; font-weight: 700; color: #334155; cursor: pointer;
    }
    .btn-action:hover { background: #f1f5f9; }
    .btn-selected { border-color: #0f766e; color: #0f766e; background: #ccfbf1; }
    .btn-calc { background: #0f766e; color: #ffffff; border-color: #0f766e; }
    .btn-calc:hover { background: #0d9488; }
    .card { padding: 1.25rem; background: #fff; border-radius: 0.75rem; border: 1px solid #e2e8f0; }
    .slips-section { display: flex; flex-direction: column; gap: 1rem; }
    .section-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem; }
    .section-header h3 { margin: 0 0 0.2rem; font-size: 1.05rem; font-weight: 700; color: #0f172a; }
    .count-badge { background: #f1f5f9; color: #475569; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 999px; }
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    .data-table th { background: #f8fafc; padding: 0.65rem 0.85rem; border-bottom: 1px solid #cbd5e1; text-align: left; font-weight: 700; color: #475569; font-size: 0.8rem; }
    .data-table td { padding: 0.65rem 0.85rem; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: middle; }
    .data-table code { background: #f1f5f9; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 700; color: #0f172a; font-size: 0.85rem; }
    .btn-export-excel {
      background: #0f766e; color: #fff; border: none; padding: 0.35rem 0.75rem; border-radius: 0.4rem;
      font-size: 0.78rem; font-weight: 700; cursor: pointer; transition: background 0.15s;
    }
    .btn-export-excel:hover { background: #0d9488; }
    .th-center, .td-center { text-align: center !important; }
    .th-num, .td-num { text-align: right !important; }
    .highlight-rec { color: #0f766e; font-weight: 600; }
    .text-success { color: #16a34a; font-weight: 700; }
    .text-danger { color: #dc2626; font-weight: 600; }
    .text-primary { color: #1e40af; font-weight: 700; }
    .btn-slip {
      padding: 0.25rem 0.55rem; font-size: 0.75rem; font-weight: 700; border-radius: 0.4rem;
      border: 1px solid #cbd5e1; background: #f8fafc; color: #0f766e; cursor: pointer;
    }
    .btn-slip:hover { background: #f0fdfa; border-color: #0f766e; }
    .empty-msg { padding: 2rem; color: #64748b; }
    .modal-backdrop { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); display: flex; justify-content: center; align-items: center; z-index: 1000; padding: 1rem; }
    .modal-card { background: #fff; padding: 1.5rem; border-radius: 0.75rem; width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 1rem; }
    .slip-modal { max-width: 680px; }
    .slip-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 0.5rem; }
    .slip-header h2 { margin: 0; font-size: 1.2rem; color: #0f172a; }
    .slip-sub { margin: 0.25rem 0 0; font-size: 0.78rem; color: #64748b; font-weight: 600; }
    .slip-meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; background: #f8fafc; padding: 0.75rem; border-radius: 0.5rem; font-size: 0.85rem; }
    .slip-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-top: 0.5rem; }
    .slip-table th { background: #f1f5f9; padding: 0.5rem; text-align: left; font-size: 0.78rem; border-bottom: 1px solid #cbd5e1; }
    .slip-table td { padding: 0.5rem; border-bottom: 1px solid #e2e8f0; }
    .badge-green { background: #dcfce7; color: #166534; font-size: 0.7rem; padding: 0.1rem 0.35rem; border-radius: 3px; font-weight: 700; }
    .badge-red { background: #fee2e2; color: #991b1b; font-size: 0.7rem; padding: 0.1rem 0.35rem; border-radius: 3px; font-weight: 700; }
    .slip-totals-box { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 0.75rem 1rem; border-radius: 0.5rem; font-size: 0.9rem; }
    .net-highlight { font-size: 1.05rem; color: #0f766e; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 0.5rem; }
    .btn-cancel { padding: 0.45rem 0.9rem; border-radius: 0.4rem; border: 1px solid #cbd5e1; background: #fff; font-weight: 600; cursor: pointer; }
    .btn-save { padding: 0.45rem 0.9rem; border-radius: 0.4rem; border: none; background: #0f766e; color: #fff; font-weight: 700; cursor: pointer; }
    .form-group { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 0.75rem; }
    .form-group label { font-size: 0.82rem; font-weight: 700; color: #334155; }
    .form-group input { padding: 0.5rem 0.75rem; border: 1px solid #cbd5e1; border-radius: 0.4rem; font-size: 0.9rem; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
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

  exportConsolidatedExcel(): void {
    const list = this.slips();
    if (!list.length) return;

    const periodName = this.selectedPeriod()?.periodName || 'Nomina';
    const dateNow = new Date().toLocaleDateString('es-CO') + ' ' + new Date().toLocaleTimeString('es-CO');

    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Nomina</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, sans-serif; }
          .title { background-color: #0F172A; color: #FFFFFF; font-size: 13pt; font-weight: bold; text-align: center; height: 32px; }
          .sub { background-color: #1E293B; color: #E2E8F0; font-size: 10pt; font-weight: bold; text-align: center; height: 24px; }
          .meta { background-color: #F1F5F9; color: #475569; font-size: 9pt; font-style: italic; text-align: center; height: 20px; }
          .th { background-color: #0F766E; color: #FFFFFF; font-weight: bold; text-align: center; border: 1px solid #0D9488; height: 28px; font-size: 9.5pt; }
          .td-text { text-align: left; border: 1px solid #CBD5E1; font-size: 9pt; padding: 4px; }
          .td-center { text-align: center; border: 1px solid #CBD5E1; font-size: 9pt; padding: 4px; }
          .td-num { text-align: right; border: 1px solid #CBD5E1; font-size: 9pt; padding: 4px; mso-number-format: "$#,##0"; }
          .even { background-color: #F8FAFC; }
          .total-row { background-color: #E2E8F0; font-weight: bold; font-size: 10pt; border-top: 2px solid #0F172A; border-bottom: 3px double #0F172A; }
        </style>
      </head>
      <body>
        <table border="0" cellspacing="0" cellpadding="4">
          <tr>
            <td colspan="9" class="title">CORAZA SEGURIDAD C.T.A. — CONSOLIDADO OFICIAL DE LIQUIDACI&Oacute;N DE N&Oacute;MINA</td>
          </tr>
          <tr>
            <td colspan="9" class="sub">PERIODO: ${periodName} | TOTAL ASOCIADOS: ${list.length}</td>
          </tr>
          <tr>
            <td colspan="9" class="meta">NIT: 811.021.524-8 &middot; Licencia SuperVigilancia Resol. No. 0002848 &middot; Generado: ${dateNow}</td>
          </tr>
          <tr><td colspan="9" style="height:10px;"></td></tr>
          <tr>
            <th class="th">C&Eacute;DULA</th>
            <th class="th">NOMBRE COMPLETO</th>
            <th class="th">D&Iacute;AS</th>
            <th class="th">B&Aacute;SICO</th>
            <th class="th">AUX. TRANSPORTE</th>
            <th class="th">RECARGOS (NOCT / DOM / FEST)</th>
            <th class="th">TOTAL DEVENGADO</th>
            <th class="th">TOTAL DEDUCCIONES</th>
            <th class="th">NETO A PAGAR</th>
          </tr>
    `;

    let totDias = 0, totBas = 0, totAux = 0, totRec = 0, totDev = 0, totDed = 0, totNet = 0;

    list.forEach((s, idx) => {
      const cls = idx % 2 === 0 ? '' : ' even';
      const name = `${s.associate?.firstName || ''} ${s.associate?.firstLastName || ''}`.trim();
      totDias += s.workedDays || 0;
      totBas += s.basicSalary || 0;
      totAux += s.transportAllowance || 0;
      totRec += s.nightSurcharges || 0;
      totDev += s.totalDevengado || 0;
      totDed += s.totalDeducido || 0;
      totNet += s.netPay || 0;

      tableHtml += `
        <tr class="${cls}">
          <td class="td-center" style="mso-number-format:'\\@';">${s.associate?.documentNumber || ''}</td>
          <td class="td-text"><b>${name}</b></td>
          <td class="td-center">${s.workedDays || 0}</td>
          <td class="td-num">${s.basicSalary || 0}</td>
          <td class="td-num">${s.transportAllowance || 0}</td>
          <td class="td-num">${s.nightSurcharges || 0}</td>
          <td class="td-num" style="font-weight:bold; color:#16a34a;">${s.totalDevengado || 0}</td>
          <td class="td-num" style="color:#dc2626;">${s.totalDeducido || 0}</td>
          <td class="td-num" style="font-weight:bold; color:#0f766e;">${s.netPay || 0}</td>
        </tr>
      `;
    });

    tableHtml += `
        <tr class="total-row">
          <td colspan="2" style="text-align:right; font-weight:bold; padding-right:10px;">TOTALES GENERALES (${list.length} ASOCIADOS):</td>
          <td class="td-center">${totDias}</td>
          <td class="td-num">${totBas}</td>
          <td class="td-num">${totAux}</td>
          <td class="td-num">${totRec}</td>
          <td class="td-num" style="color:#16a34a;">${totDev}</td>
          <td class="td-num" style="color:#dc2626;">${totDed}</td>
          <td class="td-num" style="color:#0f766e;">${totNet}</td>
        </tr>
      </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Consolidado_Nomina_${periodName.replace(/\s+/g, '_')}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
