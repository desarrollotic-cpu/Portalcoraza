import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type {
  AbsenceStats,
  AbsencesImportReport,
  AbsenteeismKind,
  Associate,
  AssociateAbsence,
  AssociateDocumentItem,
  AssociateDocumentKind,
  AssociateHistoryEntry,
  AssociatesQuery,
  CatalogKind,
  CatalogValue,
  ComplianceMatrixRow,
  CreateAbsencePayload,
  DashboardOverview,
  DiagnosisCie10,
  ExcelImportPreview,
  HrAlert,
  HrAlertStatus,
  HrAlertType,
  JobPosition,
  PositionHistoryEntry,
  Retirement,
  WorkCenter,
} from './hr.types';

/**
 * Servicio unificado que consume TODOS los endpoints del módulo Gestión
 * Humana en el backend. Es la única puerta de entrada al API HRM desde el
 * frontend: si un componente necesita datos del módulo, los pide aquí.
 */
@Injectable({ providedIn: 'root' })
export class HrApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  // ─── Asociados ────────────────────────────────────────────────────────
  listAssociates(query: AssociatesQuery = {}): Observable<Associate[]> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<Associate[]>(`${this.api}/associates`, { params });
  }

  getAssociate(id: string): Observable<Associate> {
    return this.http.get<Associate>(`${this.api}/associates/${id}`);
  }

  getAssociateHistory(id: string): Observable<AssociateHistoryEntry[]> {
    return this.http.get<AssociateHistoryEntry[]>(`${this.api}/associates/${id}/history`);
  }

  getPositionHistory(id: string): Observable<PositionHistoryEntry[]> {
    return this.http.get<PositionHistoryEntry[]>(`${this.api}/associates/${id}/position-history`);
  }

  createAssociate(payload: Partial<Associate>): Observable<Associate> {
    return this.http.post<Associate>(`${this.api}/associates`, payload);
  }

  updateAssociate(id: string, payload: Partial<Associate>): Observable<Associate> {
    return this.http.patch<Associate>(`${this.api}/associates/${id}`, payload);
  }

  readmitAssociate(
    id: string,
    payload: {
      folderNumber?: number;
      hireDate: string;
      jobPositionId: string;
      workCenterId?: string | null;
      reason?: string;
    },
  ): Observable<Associate> {
    return this.http.post<Associate>(`${this.api}/associates/${id}/readmit`, payload);
  }

  // ─── Cargos ───────────────────────────────────────────────────────────
  listJobPositions(): Observable<JobPosition[]> {
    return this.http.get<JobPosition[]>(`${this.api}/hr/job-positions`);
  }

  createJobPosition(payload: Partial<JobPosition>): Observable<JobPosition> {
    return this.http.post<JobPosition>(`${this.api}/hr/job-positions`, payload);
  }

  updateJobPosition(id: string, payload: Partial<JobPosition>): Observable<JobPosition> {
    return this.http.patch<JobPosition>(`${this.api}/hr/job-positions/${id}`, payload);
  }

  // ─── Centros de trabajo ──────────────────────────────────────────────
  listWorkCenters(): Observable<WorkCenter[]> {
    return this.http.get<WorkCenter[]>(`${this.api}/hr/work-centers`);
  }

  createWorkCenter(payload: Partial<WorkCenter>): Observable<WorkCenter> {
    return this.http.post<WorkCenter>(`${this.api}/hr/work-centers`, payload);
  }

  updateWorkCenter(id: string, payload: Partial<WorkCenter>): Observable<WorkCenter> {
    return this.http.patch<WorkCenter>(`${this.api}/hr/work-centers/${id}`, payload);
  }

  // ─── Catálogos ───────────────────────────────────────────────────────
  listCatalog(kind: CatalogKind): Observable<CatalogValue[]> {
    return this.http.get<CatalogValue[]>(`${this.api}/hr/catalogs/${kind}`);
  }

  listAllCatalogs(): Observable<Record<CatalogKind, CatalogValue[]>> {
    return this.http.get<Record<CatalogKind, CatalogValue[]>>(`${this.api}/hr/catalogs/all`);
  }

  createCatalogValue(payload: {
    kind: CatalogKind;
    value: string;
    displayOrder?: number;
  }): Observable<CatalogValue> {
    return this.http.post<CatalogValue>(`${this.api}/hr/catalogs`, payload);
  }

  toggleCatalogValue(id: string): Observable<CatalogValue> {
    return this.http.patch<CatalogValue>(`${this.api}/hr/catalogs/${id}/toggle`, {});
  }

  // ─── Retiros ─────────────────────────────────────────────────────────
  listRetirements(from?: string, to?: string): Observable<Retirement[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<Retirement[]>(`${this.api}/hr/retirements`, { params });
  }

  getRetirementByAssociate(associateId: string): Observable<Retirement[]> {
    return this.http.get<Retirement[]>(`${this.api}/hr/retirements/associate/${associateId}`);
  }

  createRetirement(payload: Partial<Retirement>): Observable<Retirement> {
    return this.http.post<Retirement>(`${this.api}/hr/retirements`, payload);
  }

  updateRetirement(id: string, payload: Partial<Retirement>): Observable<Retirement> {
    return this.http.patch<Retirement>(`${this.api}/hr/retirements/${id}`, payload);
  }

  // ─── Documentos ──────────────────────────────────────────────────────
  listAssociateDocuments(
    associateId: string,
    kind?: AssociateDocumentKind,
  ): Observable<AssociateDocumentItem[]> {
    let params = new HttpParams();
    if (kind) params = params.set('kind', kind);
    return this.http.get<AssociateDocumentItem[]>(
      `${this.api}/hr/documents/associate/${associateId}`,
      { params },
    );
  }

  uploadAssociateDocument(
    associateId: string,
    file: File,
    documentKind: AssociateDocumentKind,
    expirationDate?: string,
    notes?: string,
  ): Observable<AssociateDocumentItem> {
    const form = new FormData();
    form.append('file', file);
    form.append('documentKind', documentKind);
    if (expirationDate) form.append('expirationDate', expirationDate);
    if (notes) form.append('notes', notes);
    return this.http.post<AssociateDocumentItem>(
      `${this.api}/hr/documents/associate/${associateId}`,
      form,
    );
  }

  deleteAssociateDocument(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.api}/hr/documents/${id}`);
  }

  // ─── Alertas ─────────────────────────────────────────────────────────
  listAlerts(filters: {
    status?: HrAlertStatus;
    associateId?: string;
    alertType?: HrAlertType;
  } = {}): Observable<HrAlert[]> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v) params = params.set(k, String(v));
    }
    return this.http.get<HrAlert[]>(`${this.api}/hr/alerts`, { params });
  }

  alertsSummary(): Observable<{ pending: number; resolved: number }> {
    return this.http.get<{ pending: number; resolved: number }>(`${this.api}/hr/alerts/summary`);
  }

  alertsByAssociate(associateId: string): Observable<HrAlert[]> {
    return this.http.get<HrAlert[]>(`${this.api}/hr/alerts/associate/${associateId}`);
  }

  resolveAlert(id: string, notes?: string): Observable<HrAlert> {
    return this.http.post<HrAlert>(`${this.api}/hr/alerts/${id}/resolve`, { notes });
  }

  runAlerts(): Observable<Record<string, number>> {
    return this.http.post<Record<string, number>>(`${this.api}/hr/alerts/run`, {});
  }

  // ─── Dashboard ───────────────────────────────────────────────────────
  dashboardOverview(): Observable<DashboardOverview> {
    return this.http.get<DashboardOverview>(`${this.api}/hr/dashboard/overview`);
  }

  complianceMatrix(): Observable<ComplianceMatrixRow[]> {
    return this.http.get<ComplianceMatrixRow[]>(`${this.api}/hr/dashboard/compliance-matrix`);
  }

  listHrAudit(limit = 100): Observable<AssociateHistoryEntry[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<AssociateHistoryEntry[]>(`${this.api}/hr/audit`, { params });
  }

  // ─── Excel ───────────────────────────────────────────────────────────
  previewExcelImport(file: File): Observable<ExcelImportPreview> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ExcelImportPreview>(`${this.api}/hr/excel/import/preview`, form);
  }

  executeExcelImport(rows: Record<string, unknown>[]): Observable<{
    created: number;
    updated: number;
    skipped: number;
    total: number;
  }> {
    return this.http.post<{ created: number; updated: number; skipped: number; total: number }>(
      `${this.api}/hr/excel/import/execute`,
      { rows },
    );
  }

  exportAssociatesUrl(): string {
    return `${this.api}/hr/excel/export/associates`;
  }

  exportComplianceUrl(): string {
    return `${this.api}/hr/excel/export/compliance`;
  }

  excelTemplateUrl(): string {
    return `${this.api}/hr/excel/template`;
  }

  downloadBlob(url: string): Observable<Blob> {
    return this.http.get(url, { responseType: 'blob' });
  }

  // ─── Ausentismo ──────────────────────────────────────────────────────
  listAbsences(filters: {
    kind?: AbsenteeismKind;
    associateId?: string;
    search?: string;
    from?: string;
    to?: string;
  } = {}): Observable<AssociateAbsence[]> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    }
    return this.http.get<AssociateAbsence[]>(`${this.api}/hr/absences`, { params });
  }

  absenceStats(): Observable<AbsenceStats> {
    return this.http.get<AbsenceStats>(`${this.api}/hr/absences/stats`);
  }

  searchDiagnoses(q: string, limit = 20): Observable<DiagnosisCie10[]> {
    let params = new HttpParams().set('limit', String(limit));
    if (q) params = params.set('q', q);
    return this.http.get<DiagnosisCie10[]>(`${this.api}/hr/absences/diagnoses`, { params });
  }

  createAbsence(payload: CreateAbsencePayload): Observable<AssociateAbsence> {
    return this.http.post<AssociateAbsence>(`${this.api}/hr/absences`, payload);
  }

  updateAbsence(
    id: string,
    payload: Partial<CreateAbsencePayload>,
  ): Observable<AssociateAbsence> {
    return this.http.patch<AssociateAbsence>(`${this.api}/hr/absences/${id}`, payload);
  }

  deleteAbsence(id: string): Observable<{ ok: boolean }> {
    return this.http.delete<{ ok: boolean }>(`${this.api}/hr/absences/${id}`);
  }

  importAbsencesExcel(file: File): Observable<AbsencesImportReport> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<AbsencesImportReport>(`${this.api}/hr/absences/import/excel`, form);
  }
}
