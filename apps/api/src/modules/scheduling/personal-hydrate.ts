import type { PersonalRole } from './entities/monthly-schedule.entity';

export function backfillPersonalAssociates(
  personal: PersonalRole[],
  assignments: Array<{ role: string; associateId: string | null }>,
  names: Map<string, string>,
): PersonalRole[] {
  return personal.map((p) => {
    let associateId = p.associateId;
    if (!associateId) {
      const counts = new Map<string, number>();
      for (const a of assignments) {
        if (a.role !== p.rol || !a.associateId) continue;
        counts.set(a.associateId, (counts.get(a.associateId) ?? 0) + 1);
      }
      let best: string | null = null;
      let bestN = 0;
      for (const [id, n] of counts) {
        if (n > bestN) {
          best = id;
          bestN = n;
        }
      }
      associateId = best;
    }
    const associateName =
      (associateId && names.get(associateId)) || p.associateName || undefined;
    return { ...p, associateId, associateName };
  });
}
