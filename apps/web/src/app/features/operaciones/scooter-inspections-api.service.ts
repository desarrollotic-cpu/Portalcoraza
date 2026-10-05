import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ScooterInspectionListItem {
  id: string;
  inspectedAt: string;
  inspectorName: string;
  receivingScooter: boolean;
  aptForOperation: boolean;
  hasNovelty: boolean;
  noveltyType: string | null;
  postId: string;
  postCode: string;
  postName: string;
}

export interface ScooterInspectionDetail extends ScooterInspectionListItem {
  answers: Record<string, boolean | string>;
  noveltyLabel: string | null;
  noveltyReportedToSupervisor: boolean | null;
  noveltyWithdrawnFromService: boolean | null;
}

@Injectable({ providedIn: 'root' })
export class ScooterInspectionsApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/scooter-inspections`;

  list(filters: {
    postId?: string;
    from?: string;
    to?: string;
    apt?: string;
    novelty?: string;
    q?: string;
  }): Observable<ScooterInspectionListItem[]> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v) params = params.set(k, v);
    }
    return this.http.get<ScooterInspectionListItem[]>(this.base, { params });
  }

  get(id: string): Observable<ScooterInspectionDetail> {
    return this.http.get<ScooterInspectionDetail>(`${this.base}/${id}`);
  }
}
