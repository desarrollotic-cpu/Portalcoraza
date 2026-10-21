import { APP_TIMEZONE } from '../../common/constants/app-timezone';

/** Hoy en Colombia como YYYY-MM-DD. */
export function hoyBogota(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE }).format(now);
}

/** Suma días calendario a un YYYY-MM-DD (sin zonas horarias de por medio). */
export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Último día de una sanción: inicio + días - 1 (un llamado de atención dura un solo día). */
export function endDateOf(start: string, dias: number): string {
  return addDays(start, Math.max(dias, 1) - 1);
}
