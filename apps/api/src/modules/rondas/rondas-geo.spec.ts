import { alturaCoincide, dentroDelRadio, digitsOnly, distanciaMetros } from './rondas-geo';

describe('rondas-geo', () => {
  it('mide ~0 m en el mismo punto', () => {
    expect(distanciaMetros(6.2442, -75.5812, 6.2442, -75.5812)).toBeLessThan(0.5);
  });

  it('acepta un paso dentro del radio 25 m y rechaza 80 m', () => {
    // ~11 m al norte
    const cerca = distanciaMetros(6.2442, -75.5812, 6.2443, -75.5812);
    expect(cerca).toBeGreaterThan(5);
    expect(cerca).toBeLessThan(25);
    expect(dentroDelRadio(cerca, 25)).toBe(true);
    expect(dentroDelRadio(80, 25)).toBe(false);
    expect(dentroDelRadio(28, 25)).toBe(false);
  });

  it('exige la misma altura para terraza vs piso', () => {
    expect(alturaCoincide(1540, 1542)).toBe(true);
    expect(alturaCoincide(1540, 1530)).toBe(false);
    expect(alturaCoincide(1540, null)).toBe(false);
    expect(alturaCoincide(null, 1500)).toBe(true);
  });

  it('compara cédula solo con dígitos', () => {
    expect(digitsOnly('1.234.567-8')).toBe('12345678');
  });
});
