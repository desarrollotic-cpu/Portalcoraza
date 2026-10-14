import {
  SEMAFORO_AMARILLO,
  SEMAFORO_AZUL,
  assertSemaforoEngine,
  calcularSemaforo,
} from './sig-semaforo';

/**
 * El semáforo decide de qué color sale cada indicador en el tablero de
 * gerencia. Los umbrales (110% y 90%) y, sobre todo, el cambio de criterio
 * entre indicadores ascendentes y descendentes son fáciles de invertir sin
 * que nadie lo note hasta que alguien toma una decisión con el dato.
 */
describe('calcularSemaforo', () => {
  describe('indicador ascendente (más es mejor)', () => {
    const asc = (r: number, m = 100) => calcularSemaforo(r, m, 'ASCENDENTE');

    it('a partir del 110% de la meta es azul', () => {
      expect(asc(110)).toBe('AZUL');
      expect(asc(150)).toBe('AZUL');
    });

    it('entre el 100% y el 110% es verde', () => {
      expect(asc(100)).toBe('VERDE');
      expect(asc(109.9)).toBe('VERDE');
    });

    it('entre el 90% y el 100% es amarillo', () => {
      expect(asc(90)).toBe('AMARILLO');
      expect(asc(99.9)).toBe('AMARILLO');
    });

    it('por debajo del 90% es rojo', () => {
      expect(asc(89.9)).toBe('ROJO');
      expect(asc(0)).toBe('ROJO');
    });
  });

  describe('indicador descendente (menos es mejor)', () => {
    const desc = (r: number, m = 100) => calcularSemaforo(r, m, 'DESCENDENTE');

    it('hasta el 90% de la meta es azul', () => {
      expect(desc(90)).toBe('AZUL');
      expect(desc(10)).toBe('AZUL');
    });

    it('entre el 90% y el 100% es verde', () => {
      expect(desc(90.1)).toBe('VERDE');
      expect(desc(100)).toBe('VERDE');
    });

    it('entre el 100% y el 110% es amarillo', () => {
      expect(desc(100.1)).toBe('AMARILLO');
      expect(desc(110)).toBe('AMARILLO');
    });

    it('por encima del 110% es rojo', () => {
      expect(desc(110.1)).toBe('ROJO');
      expect(desc(500)).toBe('ROJO');
    });
  });

  it('el mismo dato da colores opuestos según el sentido', () => {
    // Es la confusión más probable: superar la meta es bueno en accidentalidad
    // esperada y malo en número de accidentes.
    expect(calcularSemaforo(120, 100, 'ASCENDENTE')).toBe('AZUL');
    expect(calcularSemaforo(120, 100, 'DESCENDENTE')).toBe('ROJO');
  });

  describe('meta en cero', () => {
    it('ascendente: cualquier avance es azul, quedarse en cero es verde', () => {
      expect(calcularSemaforo(1, 0, 'ASCENDENTE')).toBe('AZUL');
      expect(calcularSemaforo(0, 0, 'ASCENDENTE')).toBe('VERDE');
      expect(calcularSemaforo(-1, 0, 'ASCENDENTE')).toBe('ROJO');
    });

    it('descendente: meta cero cumplida es verde, superarla es rojo', () => {
      // Caso real: "cero accidentes". Tener uno es rojo.
      expect(calcularSemaforo(0, 0, 'DESCENDENTE')).toBe('VERDE');
      expect(calcularSemaforo(1, 0, 'DESCENDENTE')).toBe('ROJO');
      expect(calcularSemaforo(-1, 0, 'DESCENDENTE')).toBe('AZUL');
    });
  });

  describe('datos inválidos', () => {
    it('devuelve rojo en vez de reventar', () => {
      expect(calcularSemaforo(NaN, 100, 'ASCENDENTE')).toBe('ROJO');
      expect(calcularSemaforo(100, NaN, 'ASCENDENTE')).toBe('ROJO');
      expect(calcularSemaforo(Infinity, 100, 'DESCENDENTE')).toBe('ROJO');
    });
  });

  it('los umbrales son los documentados', () => {
    expect(SEMAFORO_AZUL).toBe(1.1);
    expect(SEMAFORO_AMARILLO).toBe(0.9);
  });

  it('la autocomprobación del arranque pasa', () => {
    // SigSchemaBootstrap la ejecuta al iniciar la aplicación.
    expect(() => assertSemaforoEngine()).not.toThrow();
  });
});
