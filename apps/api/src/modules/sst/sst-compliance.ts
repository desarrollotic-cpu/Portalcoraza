import { SstValoracion } from './entities/sst-response.entity';

export type RiskLevel = 'BAJO' | 'MEDIO' | 'ALTO';

export function computeCompliance(valoraciones: Array<SstValoracion | null | undefined>): {
  seguro: number;
  riesgoso: number;
  na: number;
  evaluated: number;
  percent: number | null;
  nivel: RiskLevel | null;
} {
  let seguro = 0;
  let riesgoso = 0;
  let na = 0;
  for (const v of valoraciones) {
    if (v === SstValoracion.SEGURO) seguro++;
    else if (v === SstValoracion.RIESGOSO) riesgoso++;
    else if (v === SstValoracion.N_A) na++;
  }
  const evaluated = seguro + riesgoso;
  if (evaluated === 0) {
    return { seguro, riesgoso, na, evaluated, percent: null, nivel: null };
  }
  const percent = Math.round((seguro / evaluated) * 10000) / 100;
  let nivel: RiskLevel = 'ALTO';
  if (percent >= 90) nivel = 'BAJO';
  else if (percent >= 70) nivel = 'MEDIO';
  return { seguro, riesgoso, na, evaluated, percent, nivel };
}

/**
 * Autocomprobación de la fórmula. La cubre sst-compliance.spec.ts; ya no se
 * ejecuta al importar el módulo, porque un fallo ahí tiraba el arranque entero
 * del API en vez de quedarse en un rojo de CI.
 */
export function assertComplianceSelfCheck(): void {
  const a = computeCompliance([
    SstValoracion.SEGURO,
    SstValoracion.SEGURO,
    SstValoracion.RIESGOSO,
    SstValoracion.N_A,
  ]);
  if (a.percent !== 66.67 || a.nivel !== 'ALTO' || a.na !== 1) {
    throw new Error('sst-compliance self-check failed');
  }
  const b = computeCompliance([SstValoracion.SEGURO, SstValoracion.SEGURO]);
  if (b.percent !== 100 || b.nivel !== 'BAJO') {
    throw new Error('sst-compliance self-check failed (100%)');
  }
}
