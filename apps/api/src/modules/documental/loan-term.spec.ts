import {
  LOAN_ABSOLUTE_MAX_BUSINESS_DAYS,
  LOAN_MAX_BUSINESS_DAYS,
  addBusinessDays,
  loanDaysForRequest,
  loanReturnDeadlineYmd,
  ymd,
} from './loan-term';

/**
 * El plazo de devolución de un expediente es lo que dispara los recordatorios
 * automáticos y la marca de VENCIDO. Un error de un día aquí se traduce en
 * correos a funcionarios que aún están en plazo.
 */
describe('plazos de préstamo documental', () => {
  describe('ymd', () => {
    it('formatea con ceros a la izquierda', () => {
      expect(ymd(new Date(2026, 0, 5))).toBe('2026-01-05');
      expect(ymd(new Date(2026, 11, 31))).toBe('2026-12-31');
    });
  });

  describe('addBusinessDays', () => {
    it('cuenta desde el día siguiente, no desde hoy', () => {
      // Lunes 5 de octubre de 2026 + 1 hábil = martes 6.
      expect(ymd(addBusinessDays(new Date(2026, 9, 5), 1))).toBe('2026-10-06');
    });

    it('salta el fin de semana', () => {
      // Viernes 9 + 1 hábil = lunes 12.
      expect(ymd(addBusinessDays(new Date(2026, 9, 9), 1))).toBe('2026-10-12');
    });

    it('cinco hábiles desde un lunes caen el lunes siguiente', () => {
      expect(ymd(addBusinessDays(new Date(2026, 9, 5), 5))).toBe('2026-10-12');
    });

    it('cinco hábiles desde un sábado caen el viernes siguiente', () => {
      // Sábado 10: el primer hábil es el lunes 12, el quinto el viernes 16.
      expect(ymd(addBusinessDays(new Date(2026, 9, 10), 5))).toBe('2026-10-16');
    });

    it('cruza el cambio de mes', () => {
      // Lunes 26 de octubre + 5 hábiles = lunes 2 de noviembre.
      expect(ymd(addBusinessDays(new Date(2026, 9, 26), 5))).toBe('2026-11-02');
    });

    it('con cero días devuelve el mismo día', () => {
      expect(ymd(addBusinessDays(new Date(2026, 9, 7), 0))).toBe('2026-10-07');
    });

    it('ignora la hora del día de partida', () => {
      const tarde = new Date(2026, 9, 5, 23, 59, 59);
      expect(ymd(addBusinessDays(tarde, 1))).toBe('2026-10-06');
    });
  });

  describe('loanDaysForRequest', () => {
    it('sin prórroga da el plazo estándar', () => {
      expect(loanDaysForRequest(false)).toBe(LOAN_MAX_BUSINESS_DAYS);
      expect(loanDaysForRequest(false)).toBe(5);
    });

    it('con prórroga da el doble, que es el tope absoluto', () => {
      expect(loanDaysForRequest(true)).toBe(LOAN_ABSOLUTE_MAX_BUSINESS_DAYS);
      expect(loanDaysForRequest(true)).toBe(10);
    });
  });

  describe('loanReturnDeadlineYmd', () => {
    it('aplica el plazo estándar por defecto', () => {
      expect(loanReturnDeadlineYmd(new Date(2026, 9, 5))).toBe('2026-10-12');
    });

    it('acepta un plazo distinto, como el de la prórroga', () => {
      expect(loanReturnDeadlineYmd(new Date(2026, 9, 5), 10)).toBe('2026-10-19');
    });
  });
});
