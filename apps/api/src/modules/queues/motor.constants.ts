export const MOTOR_GLOBAL_QUEUE = 'motor-global';
export const MOTOR_GLOBAL_JOB_NAME = 'generate';

export function motorDedupeKey(
  tenantId: string,
  year: number,
  month: number,
  tipoCiclo: string,
): string {
  return `motor_${tenantId}_${year}_${month}_${tipoCiclo}`;
}
