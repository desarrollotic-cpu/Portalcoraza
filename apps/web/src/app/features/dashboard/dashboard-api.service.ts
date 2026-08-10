import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap, catchError } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  activeAssociates: number;
  pendingDeliveries: number;
  documentsToReview: number;
  todayShifts: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private safeArray<T>(obs: Observable<T[]>): Observable<T[]> {
    return obs.pipe(catchError(() => of([])));
  }

  loadForRole(roleCode: string): Observable<Partial<DashboardStats>> {
    switch (roleCode) {
      case 'GERENCIA':
        return this.loadGerenciaStats();
      case 'SUPERVISOR':
        return this.loadSupervisorStats();
      default:
        return of({});
    }
  }

  private loadGerenciaStats(): Observable<Partial<DashboardStats>> {
    return forkJoin({
      associates: this.safeArray(
        this.http.get<unknown[]>(`${this.baseUrl}/associates`, {
          params: new HttpParams().set('status', 'ACTIVE'),
        }),
      ),
      deliveries: this.safeArray(
        this.http.get<Array<{ status: string }>>(`${this.baseUrl}/deliveries`),
      ),
      documents: this.safeArray(
        this.http.get<Array<{ registeredAt: string }>>(`${this.baseUrl}/documental/records`),
      ),
    }).pipe(
      map(({ associates, deliveries, documents }) => ({
        activeAssociates: associates.length,
        pendingDeliveries: deliveries.filter((d) => d.status === 'PENDING').length,
        documentsToReview: this.countDocumentsToReview(documents),
      })),
    );
  }

  private loadSupervisorStats(): Observable<Partial<DashboardStats>> {
    const today = new Date().toISOString().slice(0, 10);
    return forkJoin({
      deliveries: this.safeArray(
        this.http.get<Array<{ status: string }>>(`${this.baseUrl}/deliveries`),
      ),
      posts: this.safeArray(this.http.get<Array<{ id: string }>>(`${this.baseUrl}/posts`)),
    }).pipe(
      switchMap(({ deliveries, posts }) => {
        if (posts.length === 0) {
          return of({
            pendingDeliveries: deliveries.filter((d) => d.status === 'PENDING').length,
            todayShifts: 0,
          });
        }
        const shiftRequests = posts.map((post) =>
          this.safeArray(
            this.http.get<unknown[]>(`${this.baseUrl}/scheduling/shifts`, {
              params: new HttpParams()
                .set('postId', post.id)
                .set('startDate', today)
                .set('endDate', today),
            }),
          ),
        );
        return forkJoin(shiftRequests).pipe(
          map((shiftLists) => ({
            pendingDeliveries: deliveries.filter((d) => d.status === 'PENDING').length,
            todayShifts: shiftLists.reduce((sum, list) => sum + list.length, 0),
          })),
        );
      }),
    );
  }

  private countDocumentsToReview(documents: Array<{ registeredAt: string }>): number {
    const now = Date.now();
    const msPerDay = 86400000;
    return documents.filter((doc) => {
      const registered = new Date(doc.registeredAt).getTime();
      const ageDays = (now - registered) / msPerDay;
      return ageDays >= 330;
    }).length;
  }
}
