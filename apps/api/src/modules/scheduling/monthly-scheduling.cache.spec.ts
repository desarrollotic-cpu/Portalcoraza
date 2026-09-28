import { TenantContext } from '../../common/tenant/tenant.context';
import { MonthlySchedulingService } from './monthly-scheduling.service';

describe('MonthlySchedulingService report cache', () => {
  it('separa el caché por tenant', () => {
    const service = Object.create(MonthlySchedulingService.prototype) as MonthlySchedulingService;
    (service as unknown as { reportCache: Map<string, unknown> }).reportCache = new Map();
    const cache = service as unknown as {
      readReportCache<T>(k: string): T | null;
      writeReportCache(k: string, d: unknown): void;
    };

    TenantContext.run('tenant-a', () => cache.writeReportCache('alerts:x', { from: 'a' }));

    expect(TenantContext.run('tenant-a', () => cache.readReportCache('alerts:x'))).toEqual({ from: 'a' });
    expect(TenantContext.run('tenant-b', () => cache.readReportCache('alerts:x'))).toBeNull();
  });
});
