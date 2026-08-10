import { MonthlySchedulingService } from './monthly-scheduling.service';

describe('MonthlySchedulingService.overview', () => {
  it('aggregates posts, assignments, conflicts and templates', async () => {
    const service = Object.create(
      MonthlySchedulingService.prototype,
    ) as MonthlySchedulingService;

    jest.spyOn(service, 'listByMonth').mockResolvedValue([
      {
        id: 's1',
        postId: 'post-a',
        year: 2026,
        month: 8,
        assignments: [
          { associateId: 'a1', jornada: 'normal' },
          { associateId: 'a2', jornada: 'normal' },
          { associateId: null, jornada: 'sin_asignar' },
        ],
        post: { code: 'P-A', name: 'Puesto A' },
      },
      {
        id: 's2',
        postId: 'post-b',
        year: 2026,
        month: 8,
        assignments: [{ associateId: 'a1', jornada: 'normal' }],
        post: { code: 'P-B', name: 'Puesto B' },
      },
    ] as never);

    jest.spyOn(service, 'findConflicts').mockResolvedValue([
      {
        associateId: 'a1',
        day: 3,
        postCount: 2,
        postIds: ['post-a', 'post-b'],
      },
    ]);

    jest.spyOn(service, 'listTemplates').mockResolvedValue([{}, {}] as never);

    const result = await service.overview(2026, 8);

    expect(result.kpis.postsInMonth).toBe(2);
    expect(result.kpis.assignedCells).toBe(3);
    expect(result.kpis.conflicts).toBe(1);
    expect(result.kpis.templates).toBe(2);
    expect(result.series.length).toBeGreaterThan(0);
    expect(result.series.some((s) => s.key === 'post-a')).toBe(true);
  });
});
