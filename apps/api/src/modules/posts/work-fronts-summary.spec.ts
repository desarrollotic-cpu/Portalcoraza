import { summarizeWorkFronts } from './work-fronts-summary';

/**
 * Antes vivía en work-fronts-summary.check.ts: un script suelto con su propio
 * `assert` que nadie ejecutaba, porque jest solo recoge *.spec.ts. Pasa a ser
 * una prueba de verdad, con los casos de borde que al original le faltaban.
 */
describe('summarizeWorkFronts', () => {
  it('sin frentes devuelve el guion', () => {
    expect(summarizeWorkFronts([]).label).toBe('—');
    expect(summarizeWorkFronts(undefined).label).toBe('—');
    expect(summarizeWorkFronts(null).total).toBe(0);
  });

  it('agrupa los frentes del mismo horario', () => {
    expect(
      summarizeWorkFronts([
        { hours: 24, active: true },
        { hours: 24, active: true },
      ]).label,
    ).toBe('2 × 24h');
  });

  it('ordena 24h antes que 12h', () => {
    expect(
      summarizeWorkFronts([
        { hours: 12, active: true },
        { hours: 24, active: true },
      ]).label,
    ).toBe('1 × 24h + 1 × 12h');
  });

  it('el horario variable va al final', () => {
    expect(
      summarizeWorkFronts([
        { hours: null, active: true },
        { hours: 24, active: true },
      ]).label,
    ).toBe('1 × 24h + Horario variable');
  });

  it('nombra el horario variable en singular y en plural', () => {
    expect(summarizeWorkFronts([{ hours: null, active: true }]).label).toBe(
      'Horario variable',
    );
    expect(
      summarizeWorkFronts([
        { hours: null, active: true },
        { hours: null, active: true },
      ]).label,
    ).toBe('2 × variable');
  });

  it('excluye los frentes inactivos', () => {
    const r = summarizeWorkFronts([
      { hours: 24, active: true },
      { hours: 24, active: false },
    ]);
    expect(r.total).toBe(1);
    expect(r.h24).toBe(1);
  });

  it('cuenta como activo el frente sin la marca puesta', () => {
    // `active !== false`: un frente antiguo sin el campo sigue contando.
    const r = summarizeWorkFronts([
      { hours: 24 } as { hours: number; active: boolean },
    ]);
    expect(r.total).toBe(1);
  });

  it('clasifica como "otros" los horarios que no son 24 ni 12', () => {
    const r = summarizeWorkFronts([
      { hours: 8, active: true },
      { hours: 24, active: true },
    ]);
    expect(r.other).toBe(1);
    expect(r.h24).toBe(1);
    expect(r.label).toBe('1 × 24h + 1 × 8h');
  });
});
