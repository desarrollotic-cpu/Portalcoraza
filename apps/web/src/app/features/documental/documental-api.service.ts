import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DocumentType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentRecord {
  id: string;
  code: string;
  documentTypeId: string;
  documentType?: DocumentType;
  title: string;
  physicalLocation: string | null;
  observations: string | null;
  registeredAt: string;
  fileUrl: string | null;
  storageProvider: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentRecordPayload {
  code: string;
  documentTypeId: string;
  title: string;
  physicalLocation?: string;
  observations?: string;
  registeredAt: string;
}

export interface CreateDocumentTypePayload {
  code: string;
  name: string;
  description?: string;
}

export interface RetentionItem {
  id: string;
  dependencyCode: string;
  dependencyName: string;
  seriesCode: string;
  seriesName: string;
  subseriesCode: string | null;
  subseriesName: string | null;
  managementYears: number | null;
  centralYears: number | null;
  finalDisposition: string | null;
  legalBasis: string | null;
}

export interface Correspondence {
  id: string;
  documentCode: string | null;
  numericCode: number | null;
  documentDate: string | null;
  medium: string | null;
  documentType: string | null;
  originDept: string;
  destinationDept: string | null;
  subject: string | null;
  detail: string | null;
  status: string;
  voxelsera: string | null;
  createdAt: string;
}

export interface Minute {
  id: string;
  minuteType: string;
  postName: string | null;
  startDate: string | null;
  closeDate: string | null;
  observations: string | null;
  status: string;
  uniqueCode: string | null;
  numericCode: number | null;
  voxelsera: string | null;
}

export interface RetiredPersonnel {
  id: string;
  fullName: string;
  idNumber: string;
  retirementDate: string | null;
  retirementReason: string | null;
  observations: string | null;
  personType: string;
  numericCode: number | null;
  voxelsera: string | null;
}

export interface Contract {
  id: string;
  contractType: string | null;
  contractNumber: string | null;
  numericCode: number | null;
  partyA: string | null;
  partyB: string | null;
  nit: string | null;
  startDate: string | null;
  endDate: string | null;
  contractValue: string | null;
  contractObject: string | null;
  status: string;
  voxelsera: string | null;
}

export interface Loan {
  id: string;
  requester: string;
  department: string | null;
  document: string | null;
  documentCode: string | null;
  loanDate: string | null;
  returnDate: string | null;
  realReturnDate: string | null;
  status: string;
  observations: string | null;
}

export interface Workflow {
  id: string;
  workflowType: string | null;
  documentId: string | null;
  requester: string | null;
  approver: string | null;
  dueDate: string | null;
  status: string;
  comments: string | null;
  approvalComments: string | null;
  slaDays: number | null;
}

export interface LibraryFolder {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
  isSystem: boolean;
}

export interface LibraryFile {
  id: string;
  name: string;
  category: string | null;
  version: string;
  status: string;
  url: string | null;
  elaborationDate: string | null;
  changeDescription: string | null;
  responsible: string | null;
  folderId: string | null;
}

export interface SearchResult {
  modulo: string;
  titulo: string;
  codigo: string;
  fecha: string | null;
  id: string;
  voxelsera: string | null;
}

export interface Analytics {
  correspondencia: number;
  minutas: number;
  contratos: number;
  prestamosActivos: number;
  prestamosDevueltos: number;
  asociadosRetirados: number;
  minutasBreakdown: Record<string, number>;
}

export interface Alert {
  tipo: string;
  nivel: string;
  modulo: string;
  idRegistro: string;
  titulo: string;
  mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class DocumentalApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/documental`;

  // Registro documental genérico (existente)
  listTypes(): Observable<DocumentType[]> {
    return this.http.get<DocumentType[]>(`${this.baseUrl}/types`);
  }
  createType(payload: CreateDocumentTypePayload): Observable<DocumentType> {
    return this.http.post<DocumentType>(`${this.baseUrl}/types`, payload);
  }
  updateType(id: string, payload: Partial<CreateDocumentTypePayload>): Observable<DocumentType> {
    return this.http.patch<DocumentType>(`${this.baseUrl}/types/${id}`, payload);
  }
  listRecords(code?: string): Observable<DocumentRecord[]> {
    let params = new HttpParams();
    if (code?.trim()) params = params.set('code', code.trim());
    return this.http.get<DocumentRecord[]>(`${this.baseUrl}/records`, { params });
  }
  createRecord(payload: CreateDocumentRecordPayload): Observable<DocumentRecord> {
    return this.http.post<DocumentRecord>(`${this.baseUrl}/records`, payload);
  }
  updateRecord(id: string, payload: Partial<CreateDocumentRecordPayload>): Observable<DocumentRecord> {
    return this.http.patch<DocumentRecord>(`${this.baseUrl}/records/${id}`, payload);
  }

  // Panel / transversal
  analytics(): Observable<Analytics> {
    return this.http.get<Analytics>(`${this.baseUrl}/analytics`);
  }
  notifications(): Observable<{ totalAlertas: number; alertas: Alert[] }> {
    return this.http.get<{ totalAlertas: number; alertas: Alert[] }>(`${this.baseUrl}/notifications`);
  }
  trd(): Observable<RetentionItem[]> {
    return this.http.get<RetentionItem[]>(`${this.baseUrl}/trd`);
  }
  search(query: string): Observable<{ resultados: SearchResult[]; total: number }> {
    const params = new HttpParams().set('query', query);
    return this.http.get<{ resultados: SearchResult[]; total: number }>(`${this.baseUrl}/search`, { params });
  }
  voxelseraMap(): Observable<{ slots: Record<string, { slotId: string; code: string; count: number; items: unknown[] }> }> {
    return this.http.get<{ slots: Record<string, { slotId: string; code: string; count: number; items: unknown[] }> }>(
      `${this.baseUrl}/voxelsera-map`,
    );
  }

  // Correspondencia
  listCorrespondence(): Observable<Correspondence[]> {
    return this.http.get<Correspondence[]>(`${this.baseUrl}/correspondence`);
  }
  createCorrespondence(payload: Record<string, unknown>): Observable<Correspondence> {
    return this.http.post<Correspondence>(`${this.baseUrl}/correspondence`, payload);
  }

  // Minutas
  listMinutes(): Observable<Minute[]> {
    return this.http.get<Minute[]>(`${this.baseUrl}/minutes`);
  }
  createMinute(payload: Record<string, unknown>): Observable<Minute> {
    return this.http.post<Minute>(`${this.baseUrl}/minutes`, payload);
  }

  // Asociados retirados
  listRetired(): Observable<RetiredPersonnel[]> {
    return this.http.get<RetiredPersonnel[]>(`${this.baseUrl}/retired-personnel`);
  }
  createRetired(payload: Record<string, unknown>): Observable<RetiredPersonnel> {
    return this.http.post<RetiredPersonnel>(`${this.baseUrl}/retired-personnel`, payload);
  }

  // Contratos
  listContracts(): Observable<Contract[]> {
    return this.http.get<Contract[]>(`${this.baseUrl}/contracts`);
  }
  nextContractCode(): Observable<{ numeric: number; suggested: string }> {
    return this.http.get<{ numeric: number; suggested: string }>(`${this.baseUrl}/contracts/next-code`);
  }
  createContract(payload: Record<string, unknown>): Observable<Contract> {
    return this.http.post<Contract>(`${this.baseUrl}/contracts`, payload);
  }

  // Préstamos
  listLoans(): Observable<Loan[]> {
    return this.http.get<Loan[]>(`${this.baseUrl}/loans`);
  }
  createLoan(payload: Record<string, unknown>): Observable<Loan> {
    return this.http.post<Loan>(`${this.baseUrl}/loans`, payload);
  }
  approveLoan(id: string): Observable<Loan> {
    return this.http.put<Loan>(`${this.baseUrl}/loans/${id}/approve`, {});
  }
  rejectLoan(id: string, motivoRechazo: string): Observable<Loan> {
    return this.http.put<Loan>(`${this.baseUrl}/loans/${id}/reject`, { motivoRechazo });
  }
  returnLoan(id: string): Observable<Loan> {
    return this.http.put<Loan>(`${this.baseUrl}/loans/${id}/return`, {});
  }
  publicLoanRequest(payload: Record<string, unknown>): Observable<{ id: string }> {
    return this.http.post<{ id: string }>(`${environment.apiUrl}/public/documental/loan-request`, payload);
  }

  // Biblioteca
  libraryTree(): Observable<{ folders: LibraryFolder[]; files: LibraryFile[] }> {
    return this.http.get<{ folders: LibraryFolder[]; files: LibraryFile[] }>(`${this.baseUrl}/library/tree`);
  }
  createFolder(payload: Record<string, unknown>): Observable<LibraryFolder> {
    return this.http.post<LibraryFolder>(`${this.baseUrl}/library/folders`, payload);
  }
  createFile(payload: Record<string, unknown>): Observable<LibraryFile> {
    return this.http.post<LibraryFile>(`${this.baseUrl}/library/files`, payload);
  }
  deleteFolder(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/library/folders/${id}`);
  }
  deleteFile(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/library/files/${id}`);
  }

  // Workflows
  pendingWorkflows(): Observable<Workflow[]> {
    return this.http.get<Workflow[]>(`${this.baseUrl}/workflows/pending`);
  }
  resolveWorkflow(id: string, decision: 'APROBAR' | 'RECHAZAR', comment?: string): Observable<Workflow> {
    return this.http.post<Workflow>(`${this.baseUrl}/workflows/resolve`, { id, decision, comment });
  }
}
