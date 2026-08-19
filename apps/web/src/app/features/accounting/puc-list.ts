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
          <h1>Contabilidad & Nómina</h1>
          <p class="subtitle">Gestión unificada de nómina, colillas de pago, comprobantes contables y PUC</p>
        </div>
        <div class="tab-buttons">
          <button class="btn" [class.btn-primary]="activeTab() === 'payroll'" [class.btn-outline]="activeTab() !== 'payroll'" (click)="activeTab.set('payroll')">
            💼 Nómina & Colillas
          </button>
          <button class="btn" [class.btn-primary]="activeTab() === 'entries'" [class.btn-outline]="activeTab() !== 'entries'" (click)="activeTab.set('entries')">
            📑 Comprobantes Contables
          </button>
          <button class="btn" [class.btn-primary]="activeTab() === 'puc'" [class.btn-outline]="activeTab() !== 'puc'" (click)="activeTab.set('puc')">
            🌳 Catálogo PUC
          </button>
        </div>
      </header>

      @if (activeTab() === 'payroll') {
        <app-payroll-periods />
      }

      @if (activeTab() === 'entries') {
        <section class="card">
          <h2>Comprobantes Asentados (Partida Doble)</h2>
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
                  <td><strong>{{ e.entryNumber }}</strong></td>
                  <td>{{ e.entryDate | date: 'shortDate' }}</td>
                  <td>{{ e.concept }}</td>
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
                  <td colspan="6" class="text-center">No hay comprobantes contables registrados. Los comprobantes se generan automáticamente con la Nómina y Dotación.</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }

      @if (activeTab() === 'puc') {
        <section class="card">
          <h2>Plan Único de Cuentas (PUC)</h2>
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
                  <td><strong>{{ acc.code }}</strong></td>
                  <td>{{ acc.name }}</td>
                  <td>{{ acc.type }}</td>
                  <td>Nivel {{ acc.level }}</td>
                  <td><span [class.text-success]="acc.allowsMovement" [class.text-muted]="!acc.allowsMovement">{{ acc.allowsMovement ? 'SI (Auxiliar)' : 'NO (Mayor)' }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 1.5rem; max-width: 1300px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
    .tab-buttons { display: flex; gap: 0.5rem; }
    .card { padding: 1.5rem; background: #fff; border-radius: 8px; border: 1px solid #e2e8f0; }
    .data-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    .data-table th, .data-table td { padding: 0.75rem; border-bottom: 1px solid #e2e8f0; text-align: left; }
    .badge-module { background: #e0f2fe; color: #0369a1; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: bold; font-size: 0.8rem; }
    .badge-status { background: #dcfce7; color: #15803d; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: bold; font-size: 0.8rem; }
    .entry-details { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
    .detail-row { display: flex; gap: 0.5rem; align-items: center; }
    .code { font-weight: bold; font-family: monospace; background: #f1f5f9; padding: 0.1rem 0.3rem; border-radius: 3px; }
    .debit { color: #16a34a; font-weight: 500; }
    .credit { color: #dc2626; font-weight: 500; }
    .level-1 { background: #f8fafc; font-weight: bold; }
    .level-2 { background: #ffffff; font-weight: 500; }
    .level-3 { color: #475569; }
    .text-success { color: #16a34a; font-weight: bold; }
    .text-muted { color: #94a3b8; }
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
