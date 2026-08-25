import { CurrencyPipe, DatePipe, CommonModule } from '@angular/common';
import { Component, OnInit, signal, inject } from '@angular/core';
import { AccountingEntry, PucAccount, AccountingService } from './accounting.service';
import { PayrollPeriodsComponent } from '../payroll/payroll-periods';

@Component({
  selector: 'app-puc-list',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, PayrollPeriodsComponent],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div>
          <h2>Contabilidad & Nómina</h2>
          <p class="subtitle">Gestión unificada de nómina, colillas de pago, comprobantes contables y PUC</p>
        </div>
        <div class="tab-buttons">
          <button class="nav-pill" [class.active]="activeTab() === 'payroll'" (click)="activeTab.set('payroll')">
            💼 Nómina & Colillas
          </button>
          <button class="nav-pill" [class.active]="activeTab() === 'entries'" (click)="activeTab.set('entries')">
            📑 Comprobantes Contables
          </button>
          <button class="nav-pill" [class.active]="activeTab() === 'puc'" (click)="activeTab.set('puc')">
            🌳 Catálogo PUC
          </button>
        </div>
      </header>

      @if (activeTab() === 'payroll') {
        <app-payroll-periods />
      }

      @if (activeTab() === 'entries') {
        <section class="card">
          <div class="card-title-bar">
            <h3>Comprobantes Asentados en PUC (Partida Doble)</h3>
            <span class="count-badge">{{ entries().length }} comprobante(s)</span>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Comprobante #</th>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Módulo Origen</th>
                  <th>Estado</th>
                  <th>Detalles (Débito / Crédito)</th>
                </tr>
              </thead>
              <tbody>
                @for (e of entries(); track e.id) {
                  <tr>
                    <td><code>{{ e.entryNumber }}</code></td>
                    <td>{{ e.entryDate | date: 'mediumDate' }}</td>
                    <td><strong>{{ e.concept }}</strong></td>
                    <td><span class="badge-module">{{ e.sourceModule }}</span></td>
                    <td><span class="badge-status">{{ e.status }}</span></td>
                    <td>
                      <div class="entry-details">
                        @for (d of e.details; track d.id) {
                          <div class="detail-row">
                            <span class="code">{{ d.accountCode }}</span>
                            <span class="name">{{ d.account?.name || 'Cuenta' }}</span>
                            <span class="debit" *ngIf="d.debitAmount > 0">Débito: {{ d.debitAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                            <span class="credit" *ngIf="d.creditAmount > 0">Crédito: {{ d.creditAmount | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                          </div>
                        }
                      </div>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="text-center empty-msg">No hay comprobantes contables registrados. Los comprobantes se generan automáticamente con la Nómina y Dotación.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }

      @if (activeTab() === 'puc') {
        <section class="card">
          <div class="card-title-bar">
            <h3>Plan Único de Cuentas (PUC)</h3>
            <span class="count-badge">{{ pucAccounts().length }} cuenta(s)</span>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Código Cuenta</th>
                  <th>Nombre de la Cuenta</th>
                  <th>Tipo</th>
                  <th>Nivel</th>
                  <th>Permite Movimiento</th>
                </tr>
              </thead>
              <tbody>
                @for (acc of pucAccounts(); track acc.code) {
                  <tr [class.level-1]="acc.level === 1" [class.level-2]="acc.level === 2" [class.level-3]="acc.level === 3">
                    <td><code>{{ acc.code }}</code></td>
                    <td><strong>{{ acc.name }}</strong></td>
                    <td><span class="badge-type">{{ acc.type }}</span></td>
                    <td>Nivel {{ acc.level }}</td>
                    <td><span [class.text-success]="acc.allowsMovement" [class.text-muted]="!acc.allowsMovement">{{ acc.allowsMovement ? '✓ SI (Auxiliar)' : '— NO (Mayor)' }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>
  `,
  styles: [`
    .page-container { display: flex; flex-direction: column; gap: 1.25rem; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; }
    .page-header h2 { margin: 0 0 0.25rem; font-size: 1.25rem; font-weight: 800; }
    .subtitle { margin: 0; color: #64748b; font-size: 0.88rem; }
    .tab-buttons { display: flex; gap: 0.5rem; flex-wrap: wrap; background: #f1f5f9; padding: 0.35rem; border-radius: 0.6rem; }
    .nav-pill {
      background: transparent; border: none; padding: 0.45rem 0.95rem; border-radius: 0.45rem;
      font-size: 0.84rem; font-weight: 700; color: #475569; cursor: pointer; transition: all 0.15s ease;
    }
    .nav-pill:hover { background: #e2e8f0; color: #0f172a; }
    .nav-pill.active { background: #0f766e; color: #ffffff; box-shadow: 0 2px 4px rgba(15, 118, 110, 0.2); }
    .card { padding: 1.25rem; background: #fff; border-radius: 0.75rem; border: 1px solid #e2e8f0; }
    .card-title-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .card-title-bar h3 { margin: 0; font-size: 1.05rem; font-weight: 700; color: #0f172a; }
    .count-badge { background: #f1f5f9; color: #475569; font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.65rem; border-radius: 999px; }
    .table-wrap { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
    .data-table th { background: #f8fafc; padding: 0.65rem 0.85rem; border-bottom: 1px solid #cbd5e1; text-align: left; font-weight: 700; color: #475569; font-size: 0.8rem; }
    .data-table td { padding: 0.65rem 0.85rem; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: middle; }
    .data-table code { background: #f1f5f9; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 700; color: #0f172a; font-size: 0.85rem; }
    .badge-module { background: #e0f2fe; color: #0369a1; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem; }
    .badge-status { background: #dcfce7; color: #15803d; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem; }
    .badge-type { background: #f1f5f9; color: #475569; padding: 0.15rem 0.45rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
    .entry-details { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.82rem; }
    .detail-row { display: flex; gap: 0.5rem; align-items: center; }
    .code { font-weight: bold; font-family: monospace; background: #f1f5f9; padding: 0.1rem 0.3rem; border-radius: 3px; }
    .debit { color: #16a34a; font-weight: 600; }
    .credit { color: #dc2626; font-weight: 600; }
    .level-1 { background: #f8fafc; font-weight: bold; }
    .level-2 { background: #ffffff; font-weight: 500; }
    .level-3 { color: #475569; }
    .text-success { color: #16a34a; font-weight: bold; }
    .text-muted { color: #94a3b8; }
    .empty-msg { padding: 2rem; color: #64748b; }
  `]
})
export class PucListComponent implements OnInit {
  private accountingService = inject(AccountingService);

  activeTab = signal<'payroll' | 'entries' | 'puc'>('payroll');
  entries = signal<AccountingEntry[]>([]);
  pucAccounts = signal<PucAccount[]>([]);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.accountingService.getEntries().subscribe((res) => this.entries.set(res));
    this.accountingService.getPucTree().subscribe((res) => this.pucAccounts.set(res));
  }
}
