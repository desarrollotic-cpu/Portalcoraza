import { ForbiddenException } from '@nestjs/common';
import { of, lastValueFrom } from 'rxjs';
import { TenantInterceptor } from './tenant.interceptor';
import { TenantContext } from './tenant.context';

function mockCtx(user?: { tenantId: string }, headers: Record<string, string> = {}) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, headers }),
    }),
  } as never;
}

describe('TenantInterceptor anti-spoof', () => {
  const interceptor = new TenantInterceptor();

  it('rejects X-Tenant-ID different from JWT', async () => {
    const next = { handle: () => of('ok') };
    expect(() =>
      interceptor.intercept(
        mockCtx({ tenantId: 'tenant-a' }, { 'x-tenant-id': 'tenant-b' }),
        next,
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows matching X-Tenant-ID and sets context', async () => {
    const next = {
      handle: () => {
        expect(TenantContext.getOptional()).toBe('tenant-a');
        return of('ok');
      },
    };
    const obs = interceptor.intercept(
      mockCtx({ tenantId: 'tenant-a' }, { 'x-tenant-id': 'tenant-a' }),
      next,
    );
    await expect(lastValueFrom(obs)).resolves.toBe('ok');
  });

  it('skips when no authenticated user', async () => {
    const next = { handle: () => of('public') };
    const obs = interceptor.intercept(mockCtx(undefined), next);
    await expect(lastValueFrom(obs)).resolves.toBe('public');
  });
});
