import { BadRequestException } from '@nestjs/common';
import { MinutaService } from './minuta.service';

describe('MinutaService parseMonthBounds', () => {
  const service = Object.create(MinutaService.prototype) as MinutaService;

  it('parses YYYY-MM to Bogota month range', () => {
    const { start, end, label } = service.parseMonthBounds('2026-08');
    expect(label).toBe('2026-08');
    expect(start.toISOString()).toBe('2026-08-01T05:00:00.000Z');
    expect(end.toISOString()).toBe('2026-09-01T05:00:00.000Z');
  });

  it('rejects invalid month', () => {
    expect(() => service.parseMonthBounds('2026-13')).toThrow(BadRequestException);
    expect(() => service.parseMonthBounds('agosto')).toThrow(BadRequestException);
  });
});

describe('MinutaService normalizeRegistradoPor', () => {
  const service = Object.create(MinutaService.prototype) as MinutaService;
  const normalize = (value: string) =>
    (
      service as unknown as { normalizeRegistradoPor(v: string): string }
    ).normalizeRegistradoPor(value);

  it('uppercases vigilante name', () => {
    expect(normalize('  juan perez ')).toBe('JUAN PEREZ');
  });

  it('rejects empty name', () => {
    expect(() => normalize(' ')).toThrow(BadRequestException);
  });
});
