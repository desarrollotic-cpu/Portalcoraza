import { splitShiftHours, horasLiquidables } from './shift-hours.split';

describe('splitShiftHours', () => {
  it('reproduce el reparto que la liquidación ya hacía bien', () => {
    // D 06–18: 8 ordinarias + 4 extra diurnas, nada nocturno.
    expect(splitShiftHours('D', false)).toEqual({ ord: 8, extD: 4, recN: 0, extN: 0, dom: 0 });
    // D8 06–14: 8 ordinarias planas.
    expect(splitShiftHours('D8', false)).toEqual({ ord: 8, extD: 0, recN: 0, extN: 0, dom: 0 });
    // N8 22–06: 8 ordinarias, todas nocturnas.
    expect(splitShiftHours('N8', false)).toEqual({ ord: 8, extD: 0, recN: 8, extN: 0, dom: 0 });
  });

  it('corrige el turno nocturno de 12 h: eran 7 horas liquidables, son 12', () => {
    // N 18–06: 18–21 diurnas + 21–06 nocturnas (9). De esas 9, las últimas 4 son
    // extra. Ordinarias = 8, de las cuales 5 llevan recargo nocturno.
    const n = splitShiftHours('N', false)!;
    expect(n).toEqual({ ord: 8, extD: 0, recN: 5, extN: 4, dom: 0 });
    expect(horasLiquidables(n)).toBe(12);
  });

  it('cuenta los códigos que antes caían como novedad con 0 horas', () => {
    // N10 20–06 — está en la barra de acciones rápidas del cuadro.
    const n10 = splitShiftHours('N10', false)!;
    expect(n10).toEqual({ ord: 8, extD: 0, recN: 7, extN: 2, dom: 0 });
    expect(horasLiquidables(n10)).toBe(10);

    expect(horasLiquidables(splitShiftHours('D9', false)!)).toBe(9);
    expect(horasLiquidables(splitShiftHours('N9', false)!)).toBe(9);
    expect(horasLiquidables(splitShiftHours('D12', false)!)).toBe(12);
    expect(horasLiquidables(splitShiftHours('N12', false)!)).toBe(12);
    expect(horasLiquidables(splitShiftHours('24H', false)!)).toBe(24);
  });

  it('en festivo liquida el turno completo en la bolsa de dominicales', () => {
    expect(splitShiftHours('D', true)).toEqual({ ord: 0, extD: 0, recN: 0, extN: 0, dom: 12 });
    expect(splitShiftHours('N', true)).toEqual({ ord: 0, extD: 0, recN: 5, extN: 0, dom: 12 });
    expect(splitShiftHours('D8', true)).toEqual({ ord: 0, extD: 0, recN: 0, extN: 0, dom: 8 });
    expect(splitShiftHours('N8', true)).toEqual({ ord: 0, extD: 0, recN: 8, extN: 0, dom: 8 });
    expect(horasLiquidables(splitShiftHours('N', true)!)).toBe(12);
  });

  it('las horas liquidables siempre son las horas reales del turno', () => {
    for (const code of ['D', 'N', 'D8', 'N8', 'N10', 'D9', 'N9', 'D12', 'N12', '24H']) {
      for (const festivo of [false, true]) {
        const s = splitShiftHours(code, festivo)!;
        expect(s).not.toBeNull();
        expect(horasLiquidables(s)).toBe(
          { D: 12, N: 12, D8: 8, N8: 8, N10: 10, D9: 9, N9: 9, D12: 12, N12: 12, '24H': 24 }[code],
        );
      }
    }
  });

  it('devuelve null para descansos y novedades', () => {
    for (const code of ['DR', 'NR', 'VAC', 'IN', 'LC', 'SP', 'AC', null, undefined, '']) {
      expect(splitShiftHours(code, false)).toBeNull();
    }
  });
});
