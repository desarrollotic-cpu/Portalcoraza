import { esDiaValido } from './fechas';

/**
 * Esta comprobación existe por un fallo que apareció en tres módulos a la vez:
 * validar la forma con una expresión regular y confiar en `new Date`, que ante
 * un 31 de febrero no falla, desborda al 3 de marzo sin avisar.
 */
describe('esDiaValido', () => {
  it('acepta días normales', () => {
    expect(esDiaValido('2026-10-14')).toBe(true);
    expect(esDiaValido('2026-01-01')).toBe(true);
    expect(esDiaValido('2026-12-31')).toBe(true);
  });

  it('rechaza días que no existen en su mes', () => {
    expect(esDiaValido('2026-02-31')).toBe(false);
    expect(esDiaValido('2026-04-31')).toBe(false);
    expect(esDiaValido('2026-06-31')).toBe(false);
    expect(esDiaValido('2026-09-31')).toBe(false);
    expect(esDiaValido('2026-11-31')).toBe(false);
  });

  it('acepta los meses de 31 días', () => {
    for (const mes of ['01', '03', '05', '07', '08', '10', '12']) {
      expect(esDiaValido(`2026-${mes}-31`)).toBe(true);
    }
  });

  it('respeta los años bisiestos', () => {
    expect(esDiaValido('2028-02-29')).toBe(true);
    expect(esDiaValido('2026-02-29')).toBe(false);
    expect(esDiaValido('2000-02-29')).toBe(true); // divisible por 400
    expect(esDiaValido('1900-02-29')).toBe(false); // divisible por 100, no por 400
  });

  it('rechaza meses y días fuera de rango', () => {
    expect(esDiaValido('2026-00-10')).toBe(false);
    expect(esDiaValido('2026-13-10')).toBe(false);
    expect(esDiaValido('2026-10-00')).toBe(false);
    expect(esDiaValido('2026-10-32')).toBe(false);
  });

  it('rechaza cualquier cosa que no sea YYYY-MM-DD', () => {
    expect(esDiaValido('14/10/2026')).toBe(false);
    expect(esDiaValido('2026-10')).toBe(false);
    expect(esDiaValido('2026-1-4')).toBe(false);
    expect(esDiaValido('hoy')).toBe(false);
    expect(esDiaValido('')).toBe(false);
    expect(esDiaValido(null)).toBe(false);
    expect(esDiaValido(undefined)).toBe(false);
  });

  it('tolera espacios alrededor', () => {
    expect(esDiaValido('  2026-10-14  ')).toBe(true);
  });
});
