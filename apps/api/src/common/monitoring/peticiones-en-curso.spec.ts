import {
  describir,
  limpiarEnCurso,
  peticionesLentas,
  registrarFin,
  registrarInicio,
  totalEnCurso,
} from './peticiones-en-curso';

/**
 * Este registro es la respuesta al punto ciego del 14 de octubre: dos reinicios
 * por memoria sin una sola muestra alta, porque el pico cabía entre dos
 * medidas y la petición culpable moría antes de poder medirse.
 */
describe('registro de peticiones en curso', () => {
  beforeEach(() => limpiarEnCurso());
  afterEach(() => limpiarEnCurso());

  it('cuenta lo que hay en vuelo y lo suelta al terminar', () => {
    const a = registrarInicio('GET', '/api/v1/asociados');
    const b = registrarInicio('POST', '/api/v1/entregas');
    expect(totalEnCurso()).toBe(2);

    registrarFin(a);
    expect(totalEnCurso()).toBe(1);
    registrarFin(b);
    expect(totalEnCurso()).toBe(0);
  });

  it('terminar dos veces la misma petición no descuadra la cuenta', () => {
    const a = registrarInicio('GET', '/x');
    registrarFin(a);
    registrarFin(a);
    expect(totalEnCurso()).toBe(0);
  });

  it('solo señala las que llevan abiertas más del umbral', () => {
    jest.useFakeTimers();
    try {
      registrarInicio('GET', '/api/v1/lenta');
      jest.advanceTimersByTime(5_000);
      registrarInicio('GET', '/api/v1/rapida');

      const lentas = peticionesLentas(4_000);
      expect(lentas).toHaveLength(1);
      expect(lentas[0].ruta).toBe('/api/v1/lenta');
    } finally {
      jest.useRealTimers();
    }
  });

  it('las ordena de la más antigua a la más reciente', () => {
    jest.useFakeTimers();
    try {
      registrarInicio('GET', '/primera');
      jest.advanceTimersByTime(1_000);
      registrarInicio('GET', '/segunda');
      jest.advanceTimersByTime(5_000);

      expect(peticionesLentas(1_000).map((p) => p.ruta)).toEqual([
        '/primera',
        '/segunda',
      ]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('sin nada en vuelo devuelve una lista vacía', () => {
    expect(peticionesLentas(1_000)).toEqual([]);
  });

  it('describe la petición con su antigüedad', () => {
    const ahora = Date.now();
    expect(
      describir({ metodo: 'GET', ruta: '/api/v1/x', desde: ahora - 2500 }, ahora),
    ).toBe('GET /api/v1/x (2500ms)');
  });
});
