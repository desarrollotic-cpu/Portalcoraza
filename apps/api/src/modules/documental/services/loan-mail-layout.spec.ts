import { approvalLoanHtml, htmlToPlain, overdueLoanHtml } from './loan-mail-layout';

describe('loan-mail-layout', () => {
  it('incluye logo y datos del préstamo aprobado', () => {
    const html = approvalLoanHtml({
      requester: 'Ana Ruiz',
      document: 'Contrato 120',
      loanDate: '2026-09-04',
      returnDate: '2026-09-20',
      department: 'OP — Operaciones',
    });
    expect(html).toContain('logo-coraza-cta.png');
    expect(html).toContain('PRESTAMO APROBADO');
    expect(html).toContain('Contrato 120');
    expect(htmlToPlain(html)).toMatch(/Contrato 120/);
    expect(html).toContain('2026-09-20');
  });

  it('vence en rojo y no se confunde con aprobación', () => {
    const html = overdueLoanHtml({
      requester: 'Ana Ruiz',
      document: 'Contrato 120',
      returnDate: '2026-08-31',
    });
    expect(html).toContain('PRESTAMO VENCIDO');
    expect(html).toContain('#b91c1c');
    expect(html).not.toContain('PRESTAMO APROBADO');
  });
});
