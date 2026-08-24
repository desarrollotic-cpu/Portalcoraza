import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ShiftType = 'DAY' | 'NIGHT' | 'REST';

export interface ShiftSchedule {
  id: string;
  associateId: string;
  postId: string;
  shiftType: ShiftType;
  workdayHours: 8 | 12;
  shiftDate: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
}

export interface CreateShiftPayload {
  associateId: string;
  postId: string;
  shiftType: ShiftType;
  workdayHours: 8 | 12;
  shiftDate: string;
  notes?: string;
}

export interface ListShiftsQuery {
  postId: string;
  startDate: string;
  endDate: string;
  associateId?: string;
}

@Injectable({ providedIn: 'root' })
export class SchedulingApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/scheduling`;
  private readonly postsUrl = `${environment.apiUrl}/posts`;
  private postsCache$: Observable<Post[]> | null = null;

  listPosts(forceRefresh = false): Observable<Post[]> {
    if (!this.postsCache$ || forceRefresh) {
      this.postsCache$ = this.http
        .get<Post[]>(this.postsUrl)
        .pipe(shareReplay({ bufferSize: 1, refCount: false }));
    }
    return this.postsCache$;
  }

  listShifts(query: ListShiftsQuery): Observable<ShiftSchedule[]> {
    let params = new HttpParams()
      .set('postId', query.postId)
      .set('startDate', query.startDate)
      .set('endDate', query.endDate);

    if (query.associateId) {
      params = params.set('associateId', query.associateId);
    }

    return this.http.get<ShiftSchedule[]>(`${this.baseUrl}/shifts`, { params });
  }

  createShift(payload: CreateShiftPayload): Observable<ShiftSchedule> {
    return this.http.post<ShiftSchedule>(`${this.baseUrl}/shifts`, payload);
  }

  updateShift(id: string, payload: Partial<CreateShiftPayload>): Observable<ShiftSchedule> {
    return this.http.patch<ShiftSchedule>(`${this.baseUrl}/shifts/${id}`, payload);
  }

  deleteShift(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/shifts/${id}`);
  }
}
