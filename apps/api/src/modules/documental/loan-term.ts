/** Plazo estándar de préstamo interno. Prórroga: +5 hábiles (máximo 10). */
export const LOAN_MAX_BUSINESS_DAYS = 5;
export const LOAN_EXTENSION_BUSINESS_DAYS = 5;
export const LOAN_ABSOLUTE_MAX_BUSINESS_DAYS =
  LOAN_MAX_BUSINESS_DAYS + LOAN_EXTENSION_BUSINESS_DAYS;

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Suma días hábiles (lun–vie), desde mañana. */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return d;
}

export function loanDaysForRequest(prorroga: boolean): number {
  return prorroga ? LOAN_ABSOLUTE_MAX_BUSINESS_DAYS : LOAN_MAX_BUSINESS_DAYS;
}

export function loanReturnDeadlineYmd(from = new Date(), days = LOAN_MAX_BUSINESS_DAYS): string {
  return ymd(addBusinessDays(from, days));
}
