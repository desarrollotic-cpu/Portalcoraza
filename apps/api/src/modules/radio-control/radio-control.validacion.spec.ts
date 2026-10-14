import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { parseClientCheckedAt } from './radio-control.constants';
import { RadioControlService } from './radio-control.service';

/**
 * Validación de entrada del control de radios.
 *
 * Es un módulo que usan los operadores todo el día y que ya ha dado dos fallos
 * en producción relacionados con el estado de las marcas. Los ayudantes que
 * normalizan estado, fecha y hora no tenían ninguna prueba.
 */
describe('RadioControlService: validación de entrada', () => {
  // Estos ayudantes no tocan la base ni la auditoría.
  const svc = new RadioControlService({} as DataSource, {} as AuditService);
  const requireStatus = (v: unknown) =>
    (svc as unknown as { requireStatus(v: unknown): string }).requireStatus(v);
  const requireDate = (v: unknown) =>
    (svc as unknown as { requireDate(v: unknown): string }).requireDate(v);
  const hmBogota = (v: string) =>
    (svc as unknown as { hmBogota(v: string): string }).hmBogota(v);

  describe('estado de la marca', () => {
    it('acepta los cuatro estados oficiales', () => {
      for (const s of ['S/N', 'N/C', 'N/A', 'C/N']) {
        expect(requireStatus(s)).toBe(s);
      }
    });

    it('acepta la forma sin barra que teclean los operadores', () => {
      expect(requireStatus('SN')).toBe('S/N');
      expect(requireStatus('NC')).toBe('N/C');
      expect(requireStatus('NA')).toBe('N/A');
      expect(requireStatus('CN')).toBe('C/N');
    });

    it('no distingue mayúsculas ni espacios de más', () => {
      expect(requireStatus('  sn  ')).toBe('S/N');
      expect(requireStatus('n/c')).toBe('N/C');
    });

    it('rechaza cualquier otra cosa en vez de guardarla', () => {
      // Guardar un estado desconocido ensucia el tablero sin avisar.
      for (const malo of ['OK', 'S-N', '', '   ', 'SI', 'X']) {
        expect(() => requireStatus(malo)).toThrow(BadRequestException);
      }
    });

    it('rechaza nulo y undefined', () => {
      expect(() => requireStatus(null)).toThrow(BadRequestException);
      expect(() => requireStatus(undefined)).toThrow(BadRequestException);
    });
  });

  describe('fecha de la pasada', () => {
    it('acepta el formato del día', () => {
      expect(requireDate('2026-10-14')).toBe('2026-10-14');
    });

    it('recorta una marca de tiempo completa al día', () => {
      expect(requireDate('2026-10-14T23:50:00.000Z')).toBe('2026-10-14');
    });

    it('rechaza formatos que no son del día', () => {
      for (const malo of ['14/10/2026', '2026-10', 'hoy', '', '2026-1-4']) {
        expect(() => requireDate(malo)).toThrow(BadRequestException);
      }
    });

    it('rechaza fechas que no existen en el calendario', () => {
      // Antes pasaban el filtro de forma y reventaban en Postgres como 500.
      expect(() => requireDate('2026-02-31')).toThrow(BadRequestException);
      expect(() => requireDate('2026-13-01')).toThrow(BadRequestException);
      expect(() => requireDate('2026-04-31')).toThrow(BadRequestException);
    });

    it('acepta el 29 de febrero en año bisiesto', () => {
      expect(requireDate('2028-02-29')).toBe('2028-02-29');
      expect(() => requireDate('2026-02-29')).toThrow(BadRequestException);
    });
  });

  describe('hora mostrada en el tablero', () => {
    it('convierte a hora de Colombia', () => {
      // 12:00 UTC son las 07:00 en Bogotá.
      expect(hmBogota('2026-10-14T12:00:00.000Z')).toBe('07:00');
    });

    it('cruza bien la medianoche hacia el día anterior', () => {
      // 02:30 UTC del 15 son las 21:30 del 14 en Bogotá: el turno de noche
      // marca a ambos lados de las 00:00.
      expect(hmBogota('2026-10-15T02:30:00.000Z')).toBe('21:30');
    });

    it('con una fecha ilegible devuelve vacío en vez de romper el tablero', () => {
      expect(hmBogota('no es una fecha')).toBe('');
    });
  });

  describe('hora enviada por el equipo del operador', () => {
    it('acepta ISO con zona horaria', () => {
      const at = parseClientCheckedAt('2026-10-07T07:15:00.000-05:00');
      expect(at.toISOString()).toBe('2026-10-07T12:15:00.000Z');
    });

    it('sin dato usa la hora del servidor', () => {
      const antes = Date.now();
      const at = parseClientCheckedAt(null);
      expect(at.getTime()).toBeGreaterThanOrEqual(antes);
      expect(parseClientCheckedAt('   ').getTime()).toBeGreaterThanOrEqual(antes);
    });

    it('con una hora inválida avisa en vez de guardar una fecha corrupta', () => {
      expect(() => parseClientCheckedAt('ayer por la tarde')).toThrow(
        'Hora del equipo inválida',
      );
    });
  });
});
