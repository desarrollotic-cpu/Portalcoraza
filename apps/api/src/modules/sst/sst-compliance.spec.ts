import { SstValoracion } from './entities/sst-response.entity';
import {
  assertComplianceSelfCheck,
  computeCompliance,
} from './sst-compliance';

const { SEGURO, RIESGOSO, N_A } = SstValoracion;

/**
 * Porcentaje de cumplimiento de una inspección de puesto de trabajo y el nivel
 * de riesgo que se deriva. De aquí salen las alertas de reincidencia, así que
 * conviene que los umbrales (90% y 70%) y el trato de los "no aplica" estén
 * fijados.
 */
describe('computeCompliance', () => {
  it('los "no aplica" no cuentan para el porcentaje', () => {
    const r = computeCompliance([SEGURO, SEGURO, RIESGOSO, N_A]);
    expect(r.na).toBe(1);
    expect(r.evaluated).toBe(3);
    expect(r.percent).toBe(66.67);
  });

  it('redondea a dos decimales', () => {
    const r = computeCompliance([SEGURO, RIESGOSO, RIESGOSO]);
    expect(r.percent).toBe(33.33);
  });

  describe('nivel de riesgo', () => {
    const conPorcentaje = (seguros: number, riesgosos: number) =>
      computeCompliance([
        ...Array<SstValoracion>(seguros).fill(SEGURO),
        ...Array<SstValoracion>(riesgosos).fill(RIESGOSO),
      ]);

    it('desde el 90% el riesgo es bajo', () => {
      expect(conPorcentaje(9, 1).percent).toBe(90);
      expect(conPorcentaje(9, 1).nivel).toBe('BAJO');
      expect(conPorcentaje(10, 0).nivel).toBe('BAJO');
    });

    it('entre el 70% y el 90% es medio', () => {
      expect(conPorcentaje(7, 3).nivel).toBe('MEDIO');
      expect(conPorcentaje(89, 11).nivel).toBe('MEDIO');
    });

    it('por debajo del 70% es alto', () => {
      expect(conPorcentaje(69, 31).nivel).toBe('ALTO');
      expect(conPorcentaje(0, 10).nivel).toBe('ALTO');
    });
  });

  it('una inspección sin responder no inventa un porcentaje', () => {
    // Importante: cero evaluadas no es 0% de cumplimiento, es "sin dato".
    const r = computeCompliance([]);
    expect(r.percent).toBeNull();
    expect(r.nivel).toBeNull();
    expect(r.evaluated).toBe(0);
  });

  it('solo "no aplica" sigue siendo sin dato', () => {
    const r = computeCompliance([N_A, N_A]);
    expect(r.percent).toBeNull();
    expect(r.na).toBe(2);
  });

  it('ignora nulos y huecos sin contarlos como respuesta', () => {
    const r = computeCompliance([SEGURO, null, undefined, RIESGOSO]);
    expect(r.evaluated).toBe(2);
    expect(r.percent).toBe(50);
  });

  it('todo seguro es 100% y riesgo bajo', () => {
    const r = computeCompliance([SEGURO, SEGURO]);
    expect(r.percent).toBe(100);
    expect(r.nivel).toBe('BAJO');
  });

  it('la autocomprobación de la fórmula pasa', () => {
    expect(() => assertComplianceSelfCheck()).not.toThrow();
  });
});
