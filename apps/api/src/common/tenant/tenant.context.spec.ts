import { TenantContext } from './tenant.context';

describe('TenantContext', () => {
  it('require throws outside context', () => {
    expect(() => TenantContext.require()).toThrow();
  });

  it('run sets tenant for nested call', () => {
    const out = TenantContext.run('11111111-1111-1111-1111-111111111111', () =>
      TenantContext.require(),
    );
    expect(out).toBe('11111111-1111-1111-1111-111111111111');
  });
});
