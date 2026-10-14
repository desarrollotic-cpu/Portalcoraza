import { Repository } from 'typeorm';
import { Associate } from '../associates/entities/associate.entity';
import { AuditService } from '../audit/audit.service';
import { ReceptionVisitor } from './entities/reception-visitor.entity';
import { ReceptionService } from './reception.service';

/**
 * Ayudantes de recepción: fechas en hora de Colombia, duración de la visita y
 * etiquetas. Son los que alimentan los informes diarios de portería y no
 * tenían ninguna prueba.
 */
describe('ReceptionService: ayudantes', () => {
  const svc = new ReceptionService(
    {} as Repository<ReceptionVisitor>,
    {} as Repository<Associate>,
    {} as AuditService,
  );

  const priv = svc as unknown as {
    parseBogotaDay(v?: string): Date | null;
    parseBogotaDayExclusive(v?: string): Date | null;
    bogotaBounds(now?: Date): Record<string, Date | number>;
    durationLabel(a: Date, b: Date): string;
    transportLabel(v: string): string;
    digitsOnly(v?: string | null): string;
  };

  describe('día en hora de Colombia', () => {
    it('empieza a medianoche de Bogotá, que son las 05:00 UTC', () => {
      expect(priv.parseBogotaDay('2026-10-14')!.toISOString()).toBe(
        '2026-10-14T05:00:00.000Z',
      );
    });

    it('el fin exclusivo es el día siguiente a la misma hora', () => {
      expect(priv.parseBogotaDayExclusive('2026-10-14')!.toISOString()).toBe(
        '2026-10-15T05:00:00.000Z',
      );
    });

    it('sin fecha o con formato raro devuelve nulo, que es "sin filtro"', () => {
      expect(priv.parseBogotaDay(undefined)).toBeNull();
      expect(priv.parseBogotaDay('')).toBeNull();
      expect(priv.parseBogotaDay('14/10/2026')).toBeNull();
      expect(priv.parseBogotaDay('2026-10')).toBeNull();
    });

    it('una fecha que no existe también devuelve nulo', () => {
      // Antes devolvía Invalid Date y rompía el Between() de la consulta.
      expect(priv.parseBogotaDay('2026-02-31')).toBeNull();
      expect(priv.parseBogotaDay('2026-13-01')).toBeNull();
      expect(priv.parseBogotaDayExclusive('2026-02-31')).toBeNull();
    });

    it('el 29 de febrero bisiesto sí vale', () => {
      expect(priv.parseBogotaDay('2028-02-29')).not.toBeNull();
      expect(priv.parseBogotaDay('2026-02-29')).toBeNull();
    });
  });

  describe('límites del día, mes y año', () => {
    it('toma el día de Colombia, no el del servidor', () => {
      // 03:00 UTC del 15 todavía es el 14 en Bogotá: el servidor corre en UTC.
      const b = priv.bogotaBounds(new Date('2026-10-15T03:00:00.000Z'));
      expect(b.d).toBe(14);
      expect(b.m).toBe(10);
      expect((b.dayStart as Date).toISOString()).toBe('2026-10-14T05:00:00.000Z');
    });

    it('en diciembre el mes siguiente es enero del año que viene', () => {
      const b = priv.bogotaBounds(new Date('2026-12-20T15:00:00.000Z'));
      expect((b.monthEnd as Date).toISOString()).toBe('2027-01-01T05:00:00.000Z');
    });

    it('la ventana de 14 días incluye hoy', () => {
      const b = priv.bogotaBounds(new Date('2026-10-14T15:00:00.000Z'));
      const dias =
        ((b.dayEnd as Date).getTime() - (b.days14Start as Date).getTime()) /
        86_400_000;
      expect(dias).toBe(14);
    });
  });

  describe('duración de la visita', () => {
    const desde = new Date('2026-10-14T12:00:00.000Z');
    const mas = (min: number) => new Date(desde.getTime() + min * 60000);

    it('por debajo de una hora, en minutos', () => {
      expect(priv.durationLabel(desde, mas(45))).toBe('45 min');
      expect(priv.durationLabel(desde, mas(59))).toBe('59 min');
    });

    it('en horas exactas no añade los minutos', () => {
      expect(priv.durationLabel(desde, mas(120))).toBe('2 h');
    });

    it('mezcla horas y minutos', () => {
      expect(priv.durationLabel(desde, mas(135))).toBe('2 h 15 min');
    });

    it('una salida anterior a la entrada no inventa una duración', () => {
      expect(priv.durationLabel(desde, mas(-30))).toBe('—');
    });

    it('entrada y salida iguales son cero minutos', () => {
      expect(priv.durationLabel(desde, desde)).toBe('0 min');
    });
  });

  describe('etiquetas', () => {
    it('traduce los medios de transporte', () => {
      expect(priv.transportLabel('MOTO')).toBe('Moto');
      expect(priv.transportLabel('TRANSPORTE_PUBLICO')).toBe('Transporte público');
      expect(priv.transportLabel('NINGUNO')).toBe('Ninguno / a pie');
    });

    it('un valor desconocido se muestra tal cual en vez de quedar vacío', () => {
      expect(priv.transportLabel('BICICLETA')).toBe('BICICLETA');
    });

    it('la cédula se compara solo por dígitos', () => {
      expect(priv.digitsOnly('1.234.567-8')).toBe('12345678');
      expect(priv.digitsOnly(null)).toBe('');
      expect(priv.digitsOnly('  CC 98765  ')).toBe('98765');
    });
  });
});
