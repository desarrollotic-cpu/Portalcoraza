import { addBusinessDays, ymd } from './loan-term';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const friday = new Date(2026, 8, 4); // 4 sep 2026 viernes
assert(ymd(addBusinessDays(friday, 5)) === '2026-09-11', '5 hábiles desde viernes = viernes siguiente');
assert(ymd(addBusinessDays(friday, 10)) === '2026-09-18', 'prórroga 10 hábiles desde viernes');
const saturday = new Date(2026, 8, 5);
assert(ymd(addBusinessDays(saturday, 1)) === '2026-09-07', '1 hábil desde sábado = lunes');
console.log('loan-term ok');
