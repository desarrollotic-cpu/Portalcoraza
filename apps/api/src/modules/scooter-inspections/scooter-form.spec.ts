import { hasNegativeAnswer, parseAnswers } from './scooter-form';

const ok = {
  structureOk: true,
  platformOk: true,
  handlebarOk: true,
  steeringOk: true,
  brakesOk: true,
  wheelsOk: true,
  wheelsSecured: true,
  batteryOk: true,
  cablesOk: true,
  chargeIndicatorOk: true,
  lightsOk: 'SI' as const,
  reflectiveOk: 'NA' as const,
  vestWorn: true,
  vestClean: true,
  otherPpe: true,
  testRideOk: true,
  noAbnormalNoise: true,
};

describe('scooter-form', () => {
  it('NA no dispara novedad', () => {
    expect(hasNegativeAnswer(true, ok, true)).toBe(false);
  });

  it('No en frenos dispara novedad', () => {
    expect(hasNegativeAnswer(true, { ...ok, brakesOk: false }, true)).toBe(true);
  });

  it('no recibir patineta dispara novedad', () => {
    expect(hasNegativeAnswer(false, ok, true)).toBe(true);
  });

  it('parseAnswers valida tri-bool', () => {
    expect(() => parseAnswers({ ...ok, lightsOk: 'TALVEZ' })).toThrow(/lightsOk/);
  });
});
