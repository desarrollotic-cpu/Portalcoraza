import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type TriBool = 'SI' | 'NO' | 'NA';

export interface ScooterAnswers {
  structureOk: boolean;
  platformOk: boolean;
  handlebarOk: boolean;
  steeringOk: boolean;
  brakesOk: boolean;
  wheelsOk: boolean;
  wheelsSecured: boolean;
  batteryOk: boolean;
  cablesOk: boolean;
  chargeIndicatorOk: boolean;
  lightsOk: TriBool;
  reflectiveOk: TriBool;
  vestWorn: boolean;
  vestClean: boolean;
  otherPpe: boolean;
  testRideOk: boolean;
  noAbnormalNoise: boolean;
}

@Injectable({ providedIn: 'root' })
export class ScooterApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/scooter-inspections`;

  eligiblePosts(): Observable<Array<{ id: string; code: string; name: string }>> {
    return this.http.get<Array<{ id: string; code: string; name: string }>>(
      `${this.base}/eligible-posts`,
    );
  }

  create(body: {
    postId?: string;
    receivingScooter: boolean;
    answers: ScooterAnswers;
    aptForOperation: boolean;
    noveltyType?: string | null;
    noveltyReportedToSupervisor?: boolean | null;
    noveltyWithdrawnFromService?: boolean | null;
  }): Observable<{ id: string; inspectedAt: string }> {
    return this.http.post<{ id: string; inspectedAt: string }>(this.base, body);
  }
}
