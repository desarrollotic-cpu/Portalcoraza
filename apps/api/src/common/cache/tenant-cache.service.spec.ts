import { TenantContext } from '../tenant/tenant.context';
import { TenantCacheService } from './tenant-cache.service';

class FakeRedis {
  store = new Map<string, string>();
  get(k: string) {
    return Promise.resolve(this.store.get(k) ?? null);
  }
  set(k: string, v: string, _ex: string, _ttl: number) {
    this.store.set(k, v);
    return Promise.resolve('OK');
  }
  scanStream({ match }: { match: string; count: number }) {
    const rx = new RegExp('^' + match.replace(/\*/g, '.*') + '$');
    const keys = [...this.store.keys()].filter((k) => rx.test(k));
    const emitters: Record<string, ((arg: unknown) => void)[]> = {};
    const stream = {
      on(evt: string, cb: (arg: unknown) => void) {
        (emitters[evt] ??= []).push(cb);
        return stream;
      },
    };
    setImmediate(() => {
      emitters['data']?.forEach((cb) => cb(keys));
      emitters['end']?.forEach((cb) => cb(undefined));
    });
    return stream;
  }
  unlink(...keys: string[]) {
    let n = 0;
    for (const k of keys) if (this.store.delete(k)) n++;
    return Promise.resolve(n);
  }
  quit() {
    return Promise.resolve('OK');
  }
}

describe('TenantCacheService', () => {
  it('scopes keys by tenant and returns cached value', async () => {
    const fake = new FakeRedis();
    const svc = new TenantCacheService(fake as never);
    let calls = 0;
    const loader = async () => {
      calls++;
      return { hello: 'world' };
    };

    await TenantContext.run('tenant-a', async () => {
      await svc.getOrSet('associates:list:1', 60, loader);
      await svc.getOrSet('associates:list:1', 60, loader);
    });
    expect(calls).toBe(1);
    expect(fake.store.has('t:tenant-a:associates:list:1')).toBe(true);

    await TenantContext.run('tenant-b', async () => {
      await svc.getOrSet('associates:list:1', 60, loader);
    });
    expect(calls).toBe(2);
    expect(fake.store.has('t:tenant-b:associates:list:1')).toBe(true);
  });

  it('invalidatePrefix removes only current tenant keys', async () => {
    const fake = new FakeRedis();
    const svc = new TenantCacheService(fake as never);
    await TenantContext.run('tenant-a', async () => {
      await svc.getOrSet('associates:list:1', 60, async () => 1);
      await svc.getOrSet('associates:list:2', 60, async () => 2);
      await svc.getOrSet('other:x', 60, async () => 3);
    });
    await TenantContext.run('tenant-b', async () => {
      await svc.getOrSet('associates:list:1', 60, async () => 99);
    });
    await TenantContext.run('tenant-a', async () => {
      const n = await svc.invalidatePrefix('associates:');
      expect(n).toBe(2);
    });
    expect(fake.store.has('t:tenant-a:other:x')).toBe(true);
    expect(fake.store.has('t:tenant-b:associates:list:1')).toBe(true);
    expect(fake.store.has('t:tenant-a:associates:list:1')).toBe(false);
  });

  it('is pass-through when redis is null', async () => {
    const svc = new TenantCacheService(null);
    const v = await svc.getOrSet('x', 60, async () => 42);
    expect(v).toBe(42);
    const n = await svc.invalidatePrefix('x');
    expect(n).toBe(0);
    expect(svc.enabled).toBe(false);
  });
});
