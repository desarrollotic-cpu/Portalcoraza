export type MotorCiclo = '12x3' | '10x5' | '2x2' | '13x2';

export interface MotorGlobalJobData {
  tenantId: string;
  year: number;
  month: number;
  tipoCiclo: MotorCiclo;
  createMissing: boolean;
  userId: string;
  requestedAt: string;
}

export interface MotorGlobalProgress {
  processed: number;
  total: number;
  ok: number;
  failed: number;
}

export interface MotorGlobalJobResult {
  year: number;
  month: number;
  tipoCiclo: string;
  processed: number;
  ok: number;
  failed: number;
}

export interface MotorJobStatusDto {
  jobId: string;
  status: 'queued' | 'active' | 'completed' | 'failed' | 'unknown';
  progress: MotorGlobalProgress | null;
  result: MotorGlobalJobResult | null;
  failedReason: string | null;
}
