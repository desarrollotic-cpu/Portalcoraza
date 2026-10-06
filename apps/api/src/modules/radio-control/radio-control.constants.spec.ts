import assert from 'node:assert/strict';
import {
  RADIO_CONTROL_SLOTS,
  isRadioControlSlot,
  isRadioControlStatus,
} from './radio-control.constants.ts';

assert.equal(RADIO_CONTROL_SLOTS.length, 11);
assert.equal(isRadioControlSlot('04:20'), true);
assert.equal(isRadioControlSlot('12:00'), false);
assert.equal(isRadioControlStatus('S/N'), true);
assert.equal(isRadioControlStatus('OK'), false);
console.log('✔ radio-control constants ok');
