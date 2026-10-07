import * as assert from 'node:assert/strict';
import {
  isRadioControlStatus,
  parseClientCheckedAt,
} from './radio-control.constants';

describe('radio-control constants', () => {
  it('valida estados y fecha del cliente', () => {
    assert.equal(isRadioControlStatus('S/N'), true);
    assert.equal(isRadioControlStatus('OK'), false);
    const at = parseClientCheckedAt('2026-10-07T07:15:00.000-05:00');
    assert.ok(at instanceof Date);
  });
});
