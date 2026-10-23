import { armarRondas, minutosEntre, rangoMesBogota } from './rondas-informe';

describe('informe mensual de rondas', () => {
  it('octubre 2026 en Bogotá va del 1-oct 00:00 COT al 1-nov 00:00 COT', () => {
    expect(rangoMesBogota(2026, 10)).toEqual({
      inicio: '2026-10-01T05:00:00.000Z',
      fin: '2026-11-01T05:00:00.000Z',
    });
  });

  it('usa inicio y fin de la sesión, no los infiere', () => {
    const rondas = armarRondas(
      [
        {
          id: 's1',
          rutaId: 'r1',
          postId: 'p1',
          puestoNombre: 'Torre Norte',
          rondaNombre: 'Ronda diurna',
          inicio: '2026-10-23T13:00:00.000Z',
          fin: '2026-10-23T13:40:00.000Z',
        },
      ],
      [
        {
          sesionId: 's1',
          puntoId: 'A',
          puntoNombre: 'Portería',
          puntoOrden: 1,
          fechaHora: '2026-10-23T13:05:00.000Z',
        },
        {
          sesionId: 's1',
          puntoId: 'B',
          puntoNombre: 'Terraza',
          puntoOrden: 2,
          fechaHora: '2026-10-23T13:20:00.000Z',
        },
      ],
      new Map([['r1', ['A', 'B']]]),
    );
    expect(rondas).toHaveLength(1);
    expect(rondas[0].inicio).toBe('2026-10-23T13:00:00.000Z');
    expect(rondas[0].fin).toBe('2026-10-23T13:40:00.000Z');
    expect(rondas[0].completa).toBe(true);
    expect(rondas[0].abierta).toBe(false);
    expect(rondas[0].puntos.map((p) => p.puntoNombre)).toEqual(['Portería', 'Terraza']);
    expect(minutosEntre(rondas[0].inicio, rondas[0].fin)).toBe(40);
  });
});
