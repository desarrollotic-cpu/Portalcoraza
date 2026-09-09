import { formatContractTerm, parseLooseDate } from './contract-term';

describe('formatContractTerm', () => {
  it('año calendario 1 ene–31 dic = 12 MESES', () => {
    expect(formatContractTerm('01/01/2024', '31/12/2024')).toBe('12 MESES');
    expect(formatContractTerm('2024-01-01', '2025-01-01')).toBe('12 MESES');
  });

  it('cuenta meses y años sueltos', () => {
    expect(formatContractTerm('15/03/2024', '15/09/2024')).toBe('6 MESES');
    expect(formatContractTerm('01/01/2024', '01/04/2026')).toBe('2 AÑOS 3 MESES');
  });

  it('mismo día = 1 DÍA; sin fechas o fin antes de inicio = vacío', () => {
    expect(formatContractTerm('10/02/2026', '10/02/2026')).toBe('1 DÍA');
    expect(formatContractTerm('10/02/2026', '01/02/2026')).toBe('');
    expect(formatContractTerm('', '31/12/2024')).toBe('');
  });

  it('parsea DD/MM/YYYY y YYYY-MM-DD', () => {
    expect(parseLooseDate('15/03/2024')?.getDate()).toBe(15);
    expect(parseLooseDate('2024-03-15')?.getMonth()).toBe(2);
    expect(parseLooseDate('32/01/2024')).toBeNull();
  });
});
