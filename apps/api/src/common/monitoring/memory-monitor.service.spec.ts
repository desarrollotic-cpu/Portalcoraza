import { Logger } from '@nestjs/common';
import { MemoryMonitorService } from './memory-monitor.service';

describe('MemoryMonitorService', () => {
  const ORIGINAL = { ...process.env };
  let logged: string[];
  let warned: string[];

  beforeEach(() => {
    logged = [];
    warned = [];
    jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation((m: unknown) => void logged.push(String(m)));
    jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation((m: unknown) => void warned.push(String(m)));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = { ...ORIGINAL };
  });

  it('registra una muestra al arrancar y guarda el pico', () => {
    const svc = new MemoryMonitorService();
    svc.onModuleInit();
    svc.onModuleDestroy();

    const line = [...logged, ...warned].find((l) => l.includes('rss='));
    expect(line).toBeDefined();
    // Las cuatro magnitudes deben estar: heap y memoria externa por separado.
    expect(line).toMatch(/rss=\d/);
    expect(line).toMatch(/heap=\d/);
    expect(line).toMatch(/ext=\d/);
    expect(line).toMatch(/pico=\d/);
    expect(svc.peakRssMb()).toBeGreaterThan(0);
  });

  it('no arranca el temporizador si está desactivado', () => {
    process.env.MEMORY_MONITOR = 'off';
    const svc = new MemoryMonitorService();
    svc.onModuleInit();
    svc.onModuleDestroy();

    expect(logged.some((l) => l.includes('desactivada'))).toBe(true);
    expect(logged.some((l) => l.includes('rss='))).toBe(false);
    expect(svc.peakRssMb()).toBe(0);
  });
});
