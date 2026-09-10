import { isMasterRole } from './master-role';

describe('isMasterRole', () => {
  it('acepta gerencia y aliases de admin', () => {
    expect(isMasterRole('GERENCIA')).toBe(true);
    expect(isMasterRole('ADMIN')).toBe(true);
    expect(isMasterRole('SUPERADMIN')).toBe(true);
  });

  it('no eleva recepción ni otros roles', () => {
    expect(isMasterRole('RECEPCIONISTA')).toBe(false);
    expect(isMasterRole('RRHH')).toBe(false);
    expect(isMasterRole(null)).toBe(false);
  });
});
