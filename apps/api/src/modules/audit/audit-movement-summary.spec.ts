import { buildMovementSummary, collectSummaryIds } from './audit-movement-summary';

describe('audit-movement-summary', () => {
  const ctx = {
    associateById: new Map([
      ['a1', { name: 'Juan Pérez', documentNumber: '123' }],
    ]),
    postById: new Map([['p1', { code: 'MED-1', name: 'Clínica' }]]),
  };

  it('resuelve ausencia por associateId', () => {
    const s = buildMovementSummary(
      {
        module: 'hr',
        action: 'absence.create',
        entityType: 'associate_absence',
        entityId: 'abs1',
        newValue: {
          associateId: 'a1',
          kind: 'INCAPACIDAD',
          startDate: '2026-10-01',
          endDate: '2026-10-03',
          absenceDays: 3,
        },
        oldValue: null,
      },
      ctx,
    );
    expect(s).toContain('Juan Pérez');
    expect(s).toContain('Incapacidad');
    expect(s).toContain('2026-10-01');
  });

  it('collectSummaryIds recoge associateId y postId', () => {
    const ids = collectSummaryIds([
      {
        module: 'hr',
        action: 'x',
        entityType: null,
        entityId: null,
        newValue: { associateId: 'a1', postId: 'p1' },
        oldValue: null,
      },
    ]);
    expect(ids.associateIds).toContain('a1');
    expect(ids.postIds).toContain('p1');
  });
});
