describe('configuración de la instrumentación de memoria', () => {
  const ORIGINAL = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL };
    jest.resetModules();
  });

  const load = () =>
    require('./memory.config') as typeof import('./memory.config');

  it('usa valores por defecto sin variables de entorno', () => {
    delete process.env.MEMORY_SAMPLE_INTERVAL_MS;
    delete process.env.MEMORY_REQUEST_DELTA_MB;
    delete process.env.MEMORY_LIMIT_MB;
    jest.resetModules();
    const cfg = load();
    expect(cfg.MEMORY_SAMPLE_INTERVAL_MS).toBe(15_000);
    expect(cfg.MEMORY_REQUEST_DELTA_MB).toBe(25);
    expect(cfg.MEMORY_LIMIT_MB).toBe(512);
  });

  it('ignora valores inválidos en vez de quedarse en cero', () => {
    process.env.MEMORY_SAMPLE_INTERVAL_MS = 'muchos';
    process.env.MEMORY_REQUEST_DELTA_MB = '-5';
    jest.resetModules();
    const cfg = load();
    expect(cfg.MEMORY_SAMPLE_INTERVAL_MS).toBe(15_000);
    expect(cfg.MEMORY_REQUEST_DELTA_MB).toBe(25);
  });

  it('se puede apagar con MEMORY_MONITOR=off', () => {
    jest.resetModules();
    const cfg = load();
    process.env.MEMORY_MONITOR = 'off';
    expect(cfg.memoryMonitorEnabled()).toBe(false);
    process.env.MEMORY_MONITOR = 'OFF';
    expect(cfg.memoryMonitorEnabled()).toBe(false);
    delete process.env.MEMORY_MONITOR;
    expect(cfg.memoryMonitorEnabled()).toBe(true);
  });

  it('convierte bytes a MB con un decimal', () => {
    jest.resetModules();
    const cfg = load();
    expect(cfg.toMb(1024 * 1024)).toBe(1);
    expect(cfg.toMb(1024 * 1024 * 2.55)).toBe(2.6);
  });

  it('el log por petición va activo salvo REQUEST_LOG=off', () => {
    delete process.env.REQUEST_LOG;
    jest.resetModules();
    expect(load().requestLogEnabled()).toBe(true);
    process.env.REQUEST_LOG = ' OFF ';
    jest.resetModules();
    expect(load().requestLogEnabled()).toBe(false);
  });
});
