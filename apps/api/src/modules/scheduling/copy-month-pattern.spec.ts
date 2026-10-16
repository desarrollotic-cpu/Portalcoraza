import { remainingMonthsOfYear } from './copy-month-pattern';

describe('copy-month-pattern', () => {
  it('remaining months after March are Apr–Dec', () => {
    expect(remainingMonthsOfYear(3)).toEqual([4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('December has no remaining months', () => {
    expect(remainingMonthsOfYear(12)).toEqual([]);
  });
});
