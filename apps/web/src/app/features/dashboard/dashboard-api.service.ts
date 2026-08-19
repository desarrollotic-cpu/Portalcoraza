import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type AlertTone = 'critical' | 'warning' | 'info';
export type CommandPeriod = 'today' | '7d' | '30d' | 'month';

export interface CommandAlert {
  id: string;
  tone: AlertTone;
  title: string;
  message: string;
  route: string;
  module: string;
}

export interface CommandHighlight {
  id: string;
  text: string;
  route: string;
  tone: AlertTone;
}

export interface CommandKpi {
  id: string;
  label: string;
  value: number;
  hint?: string;
  deltaPct?: number | null;
  deltaLabel?: string | null;
  route: string;
  warn?: boolean;
  sparkline?: number[];
}

export interface CommandScore {
  key: string;
  label: string;
  value: number | null;
  hint?: string;
}

export interface CommandActivity {
  id: string;
  module: string;
  action: string;
  entityType: string | null;
  createdAt: string;
  label: string;
}

export interface CommandCenterPayload {
  generatedAt: string;
  period: CommandPeriod;
  seriesDays: number;
  operationStatus: { code: 'stable' | 'attention' | 'critical'; label: string };
  highlights: CommandHighlight[];
  alerts: CommandAlert[];
  kpis: CommandKpi[];
  scores: CommandScore[];
  modules: Record<string, unknown>;
  activity: CommandActivity[];
}

@Injectable({ providedIn: 'root' })
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  loadCommandCenter(period: CommandPeriod = '7d'): Observable<CommandCenterPayload> {
    const params = new HttpParams().set('period', period);
    return this.http.get<CommandCenterPayload>(`${this.baseUrl}/dashboard/command-center`, {
      params,
    });
  }
}
