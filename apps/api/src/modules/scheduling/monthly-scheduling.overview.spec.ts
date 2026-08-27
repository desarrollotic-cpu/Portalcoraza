import { MonthlySchedulingService } from './monthly-scheduling.service';

describe('MonthlySchedulingService.overview', () => {
  it('aggregates posts, assignments, conflicts and templates without listByMonth', async () => {
    const service = Object.create(
      MonthlySchedulingService.prototype,
    ) as MonthlySchedulingService;

    const listSpy = jest.spyOn(service, 'listByMonth').mockResolvedValue([]);

    (service as unknown as { schedulesRepo: { count: jest.Mock } }).schedulesRepo = {
      count: jest.fn().mockResolvedValue(2),
    };

    const qb = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      addGroupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(3),
      getRawOne: jest.fn().mockResolvedValue({ n: 2 }),
      getRawMany: jest.fn().mockResolvedValue([
        { postId: 'post-a', label: 'P-A', value: '2' },
        { postId: 'post-b', label: 'P-B', value: '1' },
      ]),
    };

    (service as unknown as { assignmentsRepo: { createQueryBuilder: jest.Mock } }).assignmentsRepo =
      {
        createQueryBuilder: jest.fn().mockReturnValue(qb),
      };

    jest.spyOn(service, 'findConflicts').mockResolvedValue([
      {
        associateId: 'a1',
        day: 3,
        postCount: 2,
        postIds: ['post-a', 'post-b'],
      },
    ]);
    jest.spyOn(service, 'listTemplates').mockResolvedValue([{}, {}] as never);

    (service as unknown as { dataSource: { getRepository: jest.Mock } }).dataSource = {
      getRepository: jest.fn().mockReturnValue({
        count: jest
          .fn()
          .mockResolvedValueOnce(299)
          .mockResolvedValueOnce(250),
      }),
    };

    const result = await service.overview(2026, 8);

    expect(listSpy).not.toHaveBeenCalled();
    expect(result.catalog).toEqual({ total: 299, active: 250, inactive: 49 });
    expect(result.kpis.postsInMonth).toBe(2);
    expect(result.kpis.assignedCells).toBe(3);
    expect(result.kpis.conflicts).toBe(1);
    expect(result.kpis.templates).toBe(2);
    expect(result.series.length).toBeGreaterThan(0);
    expect(result.series.some((s) => s.key === 'post-a')).toBe(true);
  });
});
