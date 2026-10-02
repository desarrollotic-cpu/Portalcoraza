import {
  approvalLoanHtml,
  displayName,
  formatMailDate,
  htmlToPlain,
  overdueLoanHtml,
} from './loan-mail-layout';

describe('loan-mail-layout', () => {
  it('incluye logo, acta y tildes de archivo institucional', () => {
    const html = approvalLoanHtml({
      requester: 'Ana Ruiz (CC: 1017238882)',
      document: 'Contrato 120',
      loanDate: '2026-09-04',
      returnDate: '2026-09-20',
      department: 'OP — Operaciones',
    });
    expect(html).toContain('logo-coraza-cta.png');
    expect(html).toContain('Préstamo autorizado');
    expect(html).toContain('Gestión Documental');
    expect(html).toContain('Contrato 120');
    expect(html).toContain('20/09/2026');
    expect(html).toContain('Estimado(a) Ana Ruiz');
    expect(html).not.toContain('CC: 1017238882');
    expect(htmlToPlain(html)).toMatch(/Contrato 120/);
  });

  it('vence en rojo y no se confunde con aprobación', () => {
    const html = overdueLoanHtml({
      requester: 'Ana Ruiz',
      document: 'Contrato 120',
      returnDate: '2026-08-31',
    });
    expect(html).toContain('Devolución pendiente');
    expect(html).toContain('#b91c1c');
    expect(html).toContain('31/08/2026');
    expect(html).not.toContain('Préstamo autorizado');
  });

  it('limpia cédula y formatea fecha', () => {
    expect(displayName('Sergio Buitrago (CC: 71215993)')).toBe('Sergio Buitrago');
    expect(formatMailDate('2026-10-02')).toBe('02/10/2026');
  });
});
