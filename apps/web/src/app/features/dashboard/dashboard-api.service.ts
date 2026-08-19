import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type AlertTone = 'critical' | 'warning' | 'info';

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

  loadCommandCenter(): Observable<CommandCenterPayload> {
    return this.http.get<CommandCenterPayload>(`${this.baseUrl}/dashboard/command-center`);
  }
}
