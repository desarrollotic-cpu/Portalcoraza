/**
 * Check: peek no debe mutar; next sí incrementa.
 * Mock mínimo del DataSource (sin DB real).
 */
import { SequenceService } from './sequence.service';

describe('SequenceService', () => {
  it('peek returns last+1 without writing; next increments', async () => {
    let last = 3;
    const query = jest.fn(async () => [{ last_value: last }]);
    const dataSource = {
      query,
      transaction: jest.fn(async (fn: (m: { query: typeof query }) => Promise<number>) => {
        last += 1;
        return fn({
          query: jest.fn(async () => [{ last_value: last }]),
        });
      }),
    };

    const svc = new SequenceService(dataSource as never);
    expect(await svc.peek('contract')).toBe(4);
    expect(await svc.peek('contract')).toBe(4);
    expect(await svc.next('contract')).toBe(4);
    expect(await svc.peek('contract')).toBe(5);
  });
});
