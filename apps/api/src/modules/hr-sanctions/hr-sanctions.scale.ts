import { NO_APLICA, PECUNIARIA, type SanctionType } from './entities/disciplinary.entities';

/** Días/código de la 1.ª a 4.ª vez de cada numeral (1..24). 0 = llamado, -1 = no aplica, -2 = pecuniaria. */
export const ESCALA_DIAS: number[][] = [
  [5, -1, -1, -1],
  [0, 2, 3, 5],
  [1, 3, 5, -1],
  [1, 3, 5, -1],
  [0, 2, 3, 5],
  [1, 3, 5, -1],
  [1, 3, 5, -1],
  [0, 2, 3, 5],
  [1, 3, 5, -1],
  [3, 5, -1, -1],
  [0, 1, 3, 5],
  [1, 3, 5, -1],
  [0, 1, 3, 5],
  [0, 1, 3, 5],
  [5, 7, -1, -1],
  [3, 5, -1, -1],
  [0, 1, 3, 5],
  [3, 5, -1, -1],
  [7, -1, -1, -1],
  [1, 3, 5, -1],
  [5, -1, -1, -1],
  [5, -1, -1, -1],
  [-2, -1, -1, -1],
  [3, 5, -1, -1],
];

export function resolucionDe(code: number): { tipo: SanctionType; dias: number } | null {
  if (!Number.isFinite(code) || code === NO_APLICA) return null;
  if (code > 0) return { tipo: 'SUSPENSION', dias: Math.trunc(code) };
  if (code === PECUNIARIA) return { tipo: 'PECUNIARIA', dias: 0 };
  return { tipo: 'LLAMADO_ATENCION', dias: 0 };
}
