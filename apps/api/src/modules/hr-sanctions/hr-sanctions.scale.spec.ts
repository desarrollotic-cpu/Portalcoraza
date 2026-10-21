import { ESCALA_DIAS, resolucionDe } from './hr-sanctions.scale';

describe('escala de sanciones', () => {
  it('tiene los 24 numerales', () => {
    expect(ESCALA_DIAS).toHaveLength(24);
    for (const row of ESCALA_DIAS) expect(row).toHaveLength(4);
  });

  it('numeral 1: 5 días solo la primera vez', () => {
    expect(ESCALA_DIAS[0]).toEqual([5, -1, -1, -1]);
    expect(resolucionDe(5)).toEqual({ tipo: 'SUSPENSION', dias: 5 });
    expect(resolucionDe(-1)).toBeNull();
  });

  it('numeral 2: llamado, 2, 3 y 5 días', () => {
    expect(ESCALA_DIAS[1]).toEqual([0, 2, 3, 5]);
    expect(resolucionDe(0)).toEqual({ tipo: 'LLAMADO_ATENCION', dias: 0 });
  });

  it('numeral 23: sanción pecuniaria la primera vez', () => {
    expect(ESCALA_DIAS[22]).toEqual([-2, -1, -1, -1]);
    expect(resolucionDe(-2)).toEqual({ tipo: 'PECUNIARIA', dias: 0 });
  });
});
