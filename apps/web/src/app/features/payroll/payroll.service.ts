import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface PayrollPeriod {
  id: string;
  periodName: string;
  startDate: string;
  endDate: string;
  status: 'BORRADOR' | 'LIQUIDADO' | 'APROBADO' | 'CERRADO';
  createdAt: string;
}

export interface PayrollSlipDetail {
  id: string;
  conceptCode: string;
  conceptName: string;
  type: 'DEVENGADO' | 'DEDUCCION';
  hours: number;
  amount: number;
}

export interface PayrollSlip {
  id: string;
  periodId: string;
  associateId: string;
  basicSalary: number;
  workedDays: number;
  transportAllowance: number;
  nightSurcharges: number;
  overtimeAmount: number;
  healthDeduction: number;
  pensionDeduction: number;
  totalDevengado: number;
  totalDeducido: number;
  netPay: number;
  pdfUrl?: string;
  associate?: {
    id: string;
    firstName: string;
    firstLastName: string;
    documentNumber: string;
  };
  details?: PayrollSlipDetail[];
}

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private http = inject(HttpClient);
  private baseUrl = '/api/v1/payroll';

  getPeriods(): Observable<PayrollPeriod[]> {
    return this.http.get<PayrollPeriod[]>(`${this.baseUrl}/periods`);
  }

  createPeriod(dto: { periodName: string; startDate: string; endDate: string }): Observable<PayrollPeriod> {
    return this.http.post<PayrollPeriod>(`${this.baseUrl}/periods`, dto);
  }

  calculatePeriod(periodId: string): Observable<PayrollPeriod> {
    return this.http.post<PayrollPeriod>(`${this.baseUrl}/periods/${periodId}/calculate`, {});
  }

  getSlipsByPeriod(periodId: string): Observable<PayrollSlip[]> {
    return this.http.get<PayrollSlip[]>(`${this.baseUrl}/periods/${periodId}/slips`);
  }

  getSlipById(slipId: string): Observable<PayrollSlip> {
    return this.http.get<PayrollSlip>(`${this.baseUrl}/slips/${slipId}`);
  }

  getMySlips(): Observable<PayrollSlip[]> {
    return this.http.get<PayrollSlip[]>(`${this.baseUrl}/my-slips`);
  }
}
