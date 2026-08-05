import { UsersService } from './users.service';

describe('UsersService.overview', () => {
  it('returns active/inactive counts and recent users', async () => {
    const usersRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { isActive: true, total: 3 },
          { isActive: false, total: 1 },
        ]),
      }),
      find: jest.fn().mockResolvedValue([
        {
          id: 'u1',
          fullName: 'Ana',
          email: 'ana@corazaseguridadcta.com',
          isActive: true,
          createdAt: new Date('2026-08-01T00:00:00.000Z'),
          role: { name: 'RRHH' },
        },
      ]),
    };
    const rolesRepo = { count: jest.fn().mockResolvedValue(5) };

    const service = Object.create(UsersService.prototype) as UsersService;
    (service as unknown as { usersRepo: typeof usersRepo }).usersRepo = usersRepo;
    (service as unknown as { rolesRepo: typeof rolesRepo }).rolesRepo = rolesRepo;

    const result = await service.overview();

    expect(result.kpis.usersActive).toBe(3);
    expect(result.kpis.usersInactive).toBe(1);
    expect(result.kpis.roles).toBe(5);
    expect(result.recentUsers).toHaveLength(1);
    expect(result.recentUsers[0].roleName).toBe('RRHH');
  });
});
