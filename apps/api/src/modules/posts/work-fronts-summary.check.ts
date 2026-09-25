import { summarizeWorkFronts } from './work-fronts-summary';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

assert(summarizeWorkFronts([]).label === '—', 'empty');
assert(
  summarizeWorkFronts([
    { hours: 24, active: true },
    { hours: 24, active: true },
  ]).label === '2 × 24h',
  '2x24',
);
assert(
  summarizeWorkFronts([
    { hours: 24, active: true },
    { hours: 12, active: true },
  ]).label === '1 × 24h + 1 × 12h',
  '24+12',
);
assert(
  summarizeWorkFronts([{ hours: null, active: true }]).label === 'Horario variable',
  'variable',
);
assert(
  summarizeWorkFronts([
    { hours: 24, active: true },
    { hours: 24, active: false },
  ]).total === 1,
  'inactive excluded',
);

console.log('work-fronts-summary.check: ok');
