import {
  GLOBAL_TENANT_SKIP_TABLES,
  injectTenantWhere,
} from './patch-typeorm-tenant';

describe('patch-typeorm-tenant helpers', () => {
  it('denylist includes roles, permissions, cie10, organizations', () => {
    expect(GLOBAL_TENANT_SKIP_TABLES.has('roles')).toBe(true);
    expect(GLOBAL_TENANT_SKIP_TABLES.has('permissions')).toBe(true);
    expect(GLOBAL_TENANT_SKIP_TABLES.has('role_permissions')).toBe(true);
    expect(GLOBAL_TENANT_SKIP_TABLES.has('diagnosticos_cie10')).toBe(true);
    expect(GLOBAL_TENANT_SKIP_TABLES.has('organizations')).toBe(true);
    expect(GLOBAL_TENANT_SKIP_TABLES.has('posts')).toBe(false);
  });

  it('injectTenantWhere merges into plain where', () => {
    expect(injectTenantWhere({ code: 'A' }, 't1')).toEqual({
      code: 'A',
      tenantId: 't1',
    });
  });

  it('injectTenantWhere fills empty where', () => {
    expect(injectTenantWhere(undefined, 't1')).toEqual({ tenantId: 't1' });
  });

  it('injectTenantWhere maps OR array', () => {
    expect(injectTenantWhere([{ a: 1 }, { b: 2 }], 't1')).toEqual([
      { a: 1, tenantId: 't1' },
      { b: 2, tenantId: 't1' },
    ]);
  });
});
