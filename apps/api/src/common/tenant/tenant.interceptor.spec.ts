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

function mockDataSource(opts?: { failRole?: boolean }) {
  const qr = {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    isTransactionActive: true,
    isReleased: false,
    query: jest.fn().mockImplementation(async (sql: string) => {
      if (opts?.failRole && /SET LOCAL ROLE/i.test(sql)) {
        throw new Error('role missing');
      }
      return undefined;
    }),
  };
  return {
    createQueryRunner: () => qr,
    __qr: qr,
  };
}

describe('TenantInterceptor anti-spoof + RLS session', () => {
  it('rejects X-Tenant-ID different from JWT', () => {
    const ds = mockDataSource() as never;
    const interceptor = new TenantInterceptor(ds);
    const next = { handle: () => of('ok') };
    expect(() =>
      interceptor.intercept(
        mockCtx({ tenantId: 'tenant-a' }, { 'x-tenant-id': 'tenant-b' }),
        next,
      ),
    ).toThrow(ForbiddenException);
  });

  it('sets context and opens tenant transaction', async () => {
    const ds = mockDataSource() as never;
    const interceptor = new TenantInterceptor(ds);
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
    const qr = (ds as { __qr: { query: jest.Mock; commitTransaction: jest.Mock } }).__qr;
    expect(qr.query).toHaveBeenCalledWith(
      expect.stringMatching(/set_config\('app\.tenant_id'/),
      ['tenant-a'],
    );
    expect(qr.commitTransaction).toHaveBeenCalled();
  });

  it('skips when no authenticated user', async () => {
    const ds = mockDataSource() as never;
    const interceptor = new TenantInterceptor(ds);
    const next = { handle: () => of('public') };
    const obs = interceptor.intercept(mockCtx(undefined), next);
    await expect(lastValueFrom(obs)).resolves.toBe('public');
  });
});
