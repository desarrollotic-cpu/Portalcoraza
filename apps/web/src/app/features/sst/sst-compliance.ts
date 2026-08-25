import { SstValoracion } from './sst-api.service';

export type SstRiskLevel = 'BAJO' | 'MEDIO' | 'ALTO';

export function liveCompliance(valoraciones: Array<SstValoracion | '' | null | undefined>): {
  rated: number;
  total: number;
  percent: number | null;
  nivel: SstRiskLevel | null;
  seguro: number;
  riesgoso: number;
  na: number;
} {
  let seguro = 0;
  let riesgoso = 0;
  let na = 0;
  let rated = 0;
  for (const v of valoraciones) {
    if (!v) continue;
    rated++;
    if (v === 'SEGURO') seguro++;
    else if (v === 'RIESGOSO') riesgoso++;
    else if (v === 'N_A') na++;
  }
  const evaluated = seguro + riesgoso;
  if (evaluated === 0) {
    return {
      rated,
      total: valoraciones.length,
      percent: null,
      nivel: null,
      seguro,
      riesgoso,
      na,
    };
  }
  const percent = Math.round((seguro / evaluated) * 10000) / 100;
  let nivel: SstRiskLevel = 'ALTO';
  if (percent >= 90) nivel = 'BAJO';
  else if (percent >= 70) nivel = 'MEDIO';
  return { rated, total: valoraciones.length, percent, nivel, seguro, riesgoso, na };
}
