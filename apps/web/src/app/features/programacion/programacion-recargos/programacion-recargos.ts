import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  MonthlySchedulingApiService,
  PayrollAssociateRecargo,
  PayrollRecargosResponse,
} from '../monthly-scheduling-api.service';

@Component({
  selector: 'app-programacion-recargos',
  imports: [FormsModule, RouterLink, DecimalPipe],
  template: `
    <section class="page">
      <header class="head">
        <div>
          <h2>Liquidación y Recargos de Programación</h2>
          <p>
            Cálculo automático de horas ordinarias, extras diurnas/nocturnas, recargos y dominicales/festivos
            para alimentar la nómina de asociados a partir del cuadro de turnos.
          </p>
        </div>
        <div class="controls">
          <label>
            Periodo
            <input type="month" [(ngModel)]="monthStr" (ngModelChange)="load()" />
          </label>
          <button type="button" class="btn-primary" (click)="exportExcel()" [disabled]="!filteredRows().length">
             Exportar a Excel Oficial (.xlsx)
          </button>
        </div>
      </header>

      @if (loading()) {
        <p class="loading-state">Calculando horas y recargos del mes...</p>
      } @else if (error()) {
        <p class="error-msg">{{ error() }}</p>
      } @else {
        <!-- KPI METRICS SUMMARY -->
        <div class="kpi-grid">
          <div class="kpi-card">
            <span class="kpi-label">Asociados en Malla</span>
            <strong class="kpi-value">{{ data()?.totalAssociates || 0 }}</strong>
            <span class="kpi-sub">Con turnos asignados</span>
          </div>
          <div class="kpi-card highlight">
            <span class="kpi-label">Total Horas Ordinarias</span>
            <strong class="kpi-value">{{ data()?.totals?.horasOrdinarias || 0 | number }} h</strong>
            <span class="kpi-sub">Jornada base diurna/nocturna</span>
          </div>
          <div class="kpi-card accent">
            <span class="kpi-label">Recargos Nocturnos (0.35)</span>
            <strong class="kpi-value">{{ data()?.totals?.recargosNocturnos || 0 | number }} h</strong>
            <span class="kpi-sub">21:00 a 06:00</span>
          </div>
          <div class="kpi-card warn">
            <span class="kpi-label">Extras Diurnas + Nocturnas</span>
            <strong class="kpi-value">{{ ((data()?.totals?.horasExtrasDiurnas || 0) + (data()?.totals?.horasExtrasNocturnas || 0)) | number }} h</strong>
            <span class="kpi-sub">Factor 1.25 y 1.75</span>
          </div>
          <div class="kpi-card holiday">
            <span class="kpi-label">Dominicales y Festivos</span>
            <strong class="kpi-value">{{ data()?.totals?.dominicalesFestivas || 0 | number }} h</strong>
            <span class="kpi-sub">Factor 1.75 Ley Emiliani</span>
          </div>
        </div>

        <!-- SEARCH AND FILTERS -->
        <div class="filter-bar">
          <input
            type="text"
            placeholder="Buscar por nombre, cédula o puesto..."
            [(ngModel)]="searchQuery"
            class="search-inp"
          />
          <span class="count-text">Mostrando {{ filteredRows().length }} asociado(s)</span>
        </div>

        <!-- RECARGOS TABLE -->
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Cédula</th>
                <th>Nombre del Asociado</th>
                <th>Puesto(s) Asignado(s)</th>
                <th class="num">Días</th>
                <th class="num">D / N</th>
                <th class="num">Ord (h)</th>
                <th class="num">Ext D (1.25)</th>
                <th class="num">Rec N (0.35)</th>
                <th class="num">Ext N (1.75)</th>
                <th class="num">Dom/Fest (1.75)</th>
                <th class="num total-col">Total (h)</th>
              </tr>
            </thead>
            <tbody>
              @for (row of filteredRows(); track row.associateId) {
                <tr>
                  <td><code>{{ row.cedula }}</code></td>
                  <td><strong>{{ row.nombre }}</strong></td>
                  <td class="puestos-col">{{ row.puestos }}</td>
                  <td class="num">{{ row.diasLaborados }}</td>
                  <td class="num"><span class="badge-d">{{ row.turnosDiurnos }}</span> / <span class="badge-n">{{ row.turnosNocturnos }}</span></td>
                  <td class="num">{{ row.horasOrdinarias }}</td>
                  <td class="num ext-d">{{ row.horasExtrasDiurnas }}</td>
                  <td class="num rec-n">{{ row.recargosNocturnos }}</td>
                  <td class="num ext-n">{{ row.horasExtrasNocturnas }}</td>
                  <td class="num dom">{{ row.dominicalesFestivas }}</td>
                  <td class="num total-col"><strong>{{ row.totalHoras }}</strong></td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="11" class="empty-cell">
                    No se encontraron turnos programados en {{ monthStr }}.
                    <a routerLink="/programacion/cuadro">Ir al Cuadro Mensual para programar puestos →</a>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  `,
  styles: `
    .page { display: flex; flex-direction: column; gap: 1.25rem; }
    .head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .head h2 { margin: 0 0 0.25rem; font-size: 1.25rem; font-weight: 800; }
    .head p { margin: 0; color: var(--text-muted, #64748b); font-size: 0.88rem; max-width: 680px; }
    .controls { display: flex; align-items: flex-end; gap: 0.75rem; flex-wrap: wrap; }
    .controls label { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.8rem; font-weight: 700; }
    .controls input[type='month'] {
      padding: 0.45rem 0.75rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .btn-primary {
      background: #0f766e;
      color: #fff;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      font-weight: 700;
      font-size: 0.84rem;
      cursor: pointer;
    }
    .btn-primary:hover { background: #115e59; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

    /* KPIS */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 0.85rem;
    }
    .kpi-card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .kpi-card.highlight { background: #f0f9ff; border-color: #bfdbfe; }
    .kpi-card.accent { background: #faf5ff; border-color: #e9d5ff; }
    .kpi-card.warn { background: #fffbeb; border-color: #fde68a; }
    .kpi-card.holiday { background: #fef2f2; border-color: #fecaca; }
    .kpi-label { font-size: 0.75rem; font-weight: 700; color: #475569; }
    .kpi-value { font-size: 1.25rem; font-weight: 800; color: #0f172a; }
    .kpi-sub { font-size: 0.7rem; color: #64748b; }

    /* FILTERS */
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .search-inp {
      padding: 0.45rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 0.5rem;
      font-size: 0.85rem;
      min-width: 280px;
    }
    .count-text { font-size: 0.82rem; color: #64748b; }

    /* TABLE */
    .table-wrap {
      overflow-x: auto;
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      background: #fff;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.84rem; }
    th, td { padding: 0.6rem 0.85rem; border-bottom: 1px solid #f1f5f9; text-align: left; }
    th { background: #f8fafc; font-size: 0.75rem; text-transform: uppercase; font-weight: 800; color: #475569; }
    th.num, td.num { text-align: right; }
    .total-col { font-weight: 800; background: #f8fafc; color: #0f172a; }
    .puestos-col { max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .badge-d { background: #fef08a; color: #854d0e; padding: 0.1rem 0.35rem; border-radius: 0.25rem; font-weight: 800; }
    .badge-n { background: #bbf7d0; color: #166534; padding: 0.1rem 0.35rem; border-radius: 0.25rem; font-weight: 800; }
    .ext-d { color: #d97706; font-weight: 700; }
    .rec-n { color: #7e22ce; font-weight: 700; }
    .ext-n { color: #dc2626; font-weight: 700; }
    .dom { color: #b91c1c; font-weight: 700; }

    .empty-cell { text-align: center; padding: 2.5rem 1rem; color: #64748b; }
    .empty-cell a { color: #0369a1; font-weight: 700; text-decoration: none; margin-left: 0.5rem; }
    .loading-state, .error-msg { text-align: center; padding: 2rem; font-size: 0.9rem; color: #64748b; }
    .error-msg { color: #b91c1c; }
  `,
})
export class ProgramacionRecargos implements OnInit {
  private readonly api = inject(MonthlySchedulingApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly data = signal<PayrollRecargosResponse | null>(null);

  monthStr = '';
  searchQuery = '';

  ngOnInit(): void {
    this.api.getActivePeriod().subscribe({
      next: (p) => {
        this.monthStr = `${p.year}-${String(p.month).padStart(2, '0')}`;
        this.load();
      },
      error: () => {
        const now = new Date();
        this.monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        this.load();
      },
    });
  }

  load(): void {
    if (!this.monthStr) return;
    const [yStr, mStr] = this.monthStr.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10);

    this.loading.set(true);
    this.error.set(null);

    this.api.getPayrollRecargos(year, month).subscribe({
      next: (res) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo calcular la liquidación de recargos para este periodo.');
        this.loading.set(false);
      },
    });
  }

  readonly filteredRows = computed(() => {
    const associates = this.data()?.associates || [];
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return associates;
    return associates.filter(
      (a) =>
        a.nombre.toLowerCase().includes(q) ||
        a.cedula.toLowerCase().includes(q) ||
        a.puestos.toLowerCase().includes(q),
    );
  });

  exportExcel(): void {
    const rows = this.filteredRows();
    if (!rows.length) return;

    const [yStr, mStr] = (this.monthStr || '').split('-');
    const monthNames = [
      'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
      'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
    ];
    const mIdx = (parseInt(mStr, 10) || 1) - 1;
    const periodName = `${monthNames[mIdx] || mStr} DE ${yStr}`;
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
                <x:Name>Recargos ${periodName}</x:Name>
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
          .td-num { text-align: right; border: 1px solid #CBD5E1; font-size: 9pt; padding: 4px; mso-number-format: "#,##0"; }
          .even { background-color: #F8FAFC; }
          .total-row { background-color: #E2E8F0; font-weight: bold; font-size: 10pt; border-top: 2px solid #0F172A; border-bottom: 3px double #0F172A; }
        </style>
      </head>
      <body>
        <table border="0" cellspacing="0" cellpadding="4">
          <tr>
            <td colspan="14" class="title">CORAZA SEGURIDAD C.T.A. — INFORME OFICIAL DE LIQUIDACI&Oacute;N DE RECARGOS Y TURNOS</td>
          </tr>
          <tr>
            <td colspan="14" class="sub">PERIODO: ${periodName} | TOTAL ASOCIADOS EN MALLA: ${rows.length}</td>
          </tr>
          <tr>
            <td colspan="14" class="meta">NIT: 811.021.524-8 &middot; Licencia SuperVigilancia Resol. No. 0002848 &middot; Generado: ${dateNow}</td>
          </tr>
          <tr><td colspan="14" style="height:10px;"></td></tr>
          <tr>
            <th class="th">C&Eacute;DULA</th>
            <th class="th">NOMBRE COMPLETO</th>
            <th class="th">CARGO</th>
            <th class="th">PUESTOS ASIGNADOS</th>
            <th class="th">D&Iacute;AS LAB.</th>
            <th class="th">TURNOS D</th>
            <th class="th">TURNOS N</th>
            <th class="th">DESCANSOS</th>
            <th class="th">HORAS ORD.</th>
            <th class="th">REC. NOCT. (35%)</th>
            <th class="th">EXT. DIUR. (1.25)</th>
            <th class="th">EXT. NOCT. (1.75)</th>
            <th class="th">DOM. Y FEST. (1.75)</th>
            <th class="th">TOTAL HORAS</th>
          </tr>
    `;

    let totDias = 0;
    let totD = 0;
    let totN = 0;
    let totDesc = 0;
    let totOrd = 0;
    let totRecN = 0;
    let totExtD = 0;
    let totExtN = 0;
    let totDom = 0;
    let totHoras = 0;

    rows.forEach((r, idx) => {
      const cls = idx % 2 === 0 ? '' : ' even';
      totDias += r.diasLaborados || 0;
      totD += r.turnosDiurnos || 0;
      totN += r.turnosNocturnos || 0;
      totDesc += r.descansos || 0;
      totOrd += r.horasOrdinarias || 0;
      totRecN += r.recargosNocturnos || 0;
      totExtD += r.horasExtrasDiurnas || 0;
      totExtN += r.horasExtrasNocturnas || 0;
      totDom += r.dominicalesFestivas || 0;
      totHoras += r.totalHoras || 0;

      tableHtml += `
        <tr class="${cls}">
          <td class="td-center" style="mso-number-format:'\\@';">${r.cedula}</td>
          <td class="td-text"><b>${r.nombre}</b></td>
          <td class="td-text">${r.cargo}</td>
          <td class="td-text">${r.puestos}</td>
          <td class="td-num">${r.diasLaborados}</td>
          <td class="td-num">${r.turnosDiurnos}</td>
          <td class="td-num">${r.turnosNocturnos}</td>
          <td class="td-num">${r.descansos}</td>
          <td class="td-num">${r.horasOrdinarias}</td>
          <td class="td-num">${r.recargosNocturnos}</td>
          <td class="td-num">${r.horasExtrasDiurnas}</td>
          <td class="td-num">${r.horasExtrasNocturnas}</td>
          <td class="td-num">${r.dominicalesFestivas}</td>
          <td class="td-num"><b>${r.totalHoras}</b></td>
        </tr>
      `;
    });

    tableHtml += `
        <tr class="total-row">
          <td colspan="4" style="text-align:right; font-weight:bold; padding-right:10px;">TOTALES GENERALES (${rows.length} ASOCIADOS):</td>
          <td class="td-num">${totDias}</td>
          <td class="td-num">${totD}</td>
          <td class="td-num">${totN}</td>
          <td class="td-num">${totDesc}</td>
          <td class="td-num">${totOrd}</td>
          <td class="td-num">${totRecN}</td>
          <td class="td-num">${totExtD}</td>
          <td class="td-num">${totExtN}</td>
          <td class="td-num">${totDom}</td>
          <td class="td-num"><b>${totHoras}</b></td>
        </tr>
      </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Liquidacion_Recargos_Coraza_${this.monthStr}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  }
}
