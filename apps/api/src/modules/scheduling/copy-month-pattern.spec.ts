import { mapCopiedDay, remainingMonthsOfYear } from './copy-month-pattern';

describe('copy-month-pattern', () => {
  it('remaining months after March are Apr–Dec', () => {
    expect(remainingMonthsOfYear(3)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('December has no remaining months', () => {
    expect(remainingMonthsOfYear(12)).toEqual([]);
  });

  it('maps March 31 onto April 30 as the same calendar days', () => {
    expect(mapCopiedDay(30, 31)).toBe(30);
    expect(mapCopiedDay(1, 31)).toBe(1);
  });

  it('recycles February 28 onto March 29–31', () => {
    expect(mapCopiedDay(28, 28)).toBe(28);
    expect(mapCopiedDay(29, 28)).toBe(1);
    expect(mapCopiedDay(31, 28)).toBe(3);
  });
});
