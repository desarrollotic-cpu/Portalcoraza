import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface PucAccount {
  code: string;
  name: string;
  type: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO' | 'COSTO';
  level: number;
  allowsMovement: boolean;
  parentCode?: string;
}

export interface AccountingEntryDetail {
  id: string;
  accountCode: string;
  account?: PucAccount;
  debitAmount: number;
  creditAmount: number;
  costCenter?: string;
}

export interface AccountingEntry {
  id: string;
  entryNumber: string;
  entryDate: string;
  concept: string;
  sourceModule: string;
  status: string;
  details: AccountingEntryDetail[];
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class AccountingService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/accounting';

  getPucTree(): Observable<PucAccount[]> {
    return this.http.get<PucAccount[]>(`${this.baseUrl}/puc`);
  }

  getEntries(): Observable<AccountingEntry[]> {
    return this.http.get<AccountingEntry[]>(`${this.baseUrl}/entries`);
  }

  createEntry(dto: {
    concept: string;
    sourceModule: 'NOMINA' | 'DOTACION' | 'FACTURACION' | 'RECAUDO' | 'MANUAL';
    details: { accountCode: string; debitAmount: number; creditAmount: number; costCenter?: string }[];
  }): Observable<AccountingEntry> {
    return this.http.post<AccountingEntry>(`${this.baseUrl}/entries`, dto);
  }
}
