import { contractEmpty, otrosiEmpty } from './post-agreements.util';

describe('post-agreements', () => {
  it('ignora un contrato vacío y no ignora uno con número', () => {
    expect(contractEmpty({})).toBe(true);
    expect(contractEmpty({ contractNumber: '  ' })).toBe(true);
    expect(contractEmpty({ contractNumber: '1146' })).toBe(false);
    expect(contractEmpty({ armed: true })).toBe(false);
  });

  it('ignora un otro sí vacío y no ignora uno con tipo', () => {
    expect(otrosiEmpty({})).toBe(true);
    expect(otrosiEmpty({ typeText: 'prórroga' })).toBe(false);
  });
});
