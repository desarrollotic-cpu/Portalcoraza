/** Franjas horarias del reporte radio (Excel CORAZA). */
export const RADIO_CONTROL_SLOTS = [
  '01:00',
  '03:00',
  '04:20',
  '07:00',
  '09:00',
  '11:00',
  '13:00',
  '15:00',
  '19:00',
  '21:00',
  '23:00',
] as const;

export type RadioControlSlot = (typeof RADIO_CONTROL_SLOTS)[number];

export const RADIO_CONTROL_STATUSES = ['S/N', 'N/C', 'N/A', 'C/N'] as const;
export type RadioControlStatus = (typeof RADIO_CONTROL_STATUSES)[number];

export function isRadioControlSlot(v: string): v is RadioControlSlot {
  return (RADIO_CONTROL_SLOTS as readonly string[]).includes(v);
}

export function isRadioControlStatus(v: string): v is RadioControlStatus {
  return (RADIO_CONTROL_STATUSES as readonly string[]).includes(v);
}
