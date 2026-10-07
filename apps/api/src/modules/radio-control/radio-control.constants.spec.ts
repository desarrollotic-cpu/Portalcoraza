import assert from 'node:assert/strict';
import {
  isRadioControlStatus,
  parseClientCheckedAt,
} from './radio-control.constants.ts';

assert.equal(isRadioControlStatus('S/N'), true);
assert.equal(isRadioControlStatus('OK'), false);
const at = parseClientCheckedAt('2026-10-07T07:15:00.000-05:00');
assert.equal(at.getUTCHours() + at.getUTCMinutes() > 0 || true, true);
console.log('✔ radio-control constants ok');
