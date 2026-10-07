export const RADIO_CONTROL_STATUSES = ['S/N', 'N/C', 'N/A', 'C/N'] as const;
export type RadioControlStatus = (typeof RADIO_CONTROL_STATUSES)[number];

export function isRadioControlStatus(v: string): v is RadioControlStatus {
  return (RADIO_CONTROL_STATUSES as readonly string[]).includes(v);
}

/** Parsea ISO o "YYYY-MM-DDTHH:mm:ss" del equipo del operador. */
export function parseClientCheckedAt(raw: string | undefined | null): Date {
  if (!raw || !String(raw).trim()) return new Date();
  const d = new Date(String(raw).trim());
  if (!Number.isFinite(d.getTime())) {
    throw new Error('Hora del equipo inválida');
  }
  return d;
}
