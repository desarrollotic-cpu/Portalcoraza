import { buildPlanillaWorkbook, excelSheetName } from './planilla-excel';

describe('planilla-excel', () => {
  it('sanitizes sheet names and keeps them unique', () => {
    const used = new Set<string>();
    expect(excelSheetName('Puesto/808', used)).toBe('Puesto 808');
    expect(excelSheetName('Puesto 808', used)).toBe('Puesto 808 (2)');
  });

  it('one sheet per post and day 31 in 31-day months', () => {
    const wb = buildPlanillaWorkbook({
      year: 2026,
      month: 8,
      posts: [
        {
          postName: 'Navarra 808',
          status: 'publicado',
          roles: [
            {
              label: 'Titular A',
              associateName: 'JUAN PEREZ',
              document: 'CC: 123',
              codes: Array.from({ length: 31 }, () => 'D'),
            },
          ],
        },
        {
          postName: 'Interclub',
          status: 'borrador',
          roles: [
            {
              label: 'Titular B',
              associateName: 'ANA LOPEZ',
              document: 'CC: 456',
              codes: Array.from({ length: 31 }, () => 'N'),
            },
          ],
        },
      ],
    });
    expect(wb.worksheets).toHaveLength(2);
    const header = wb.worksheets[0].getRow(6);
    expect(header.getCell(2).value).toBe(1);
    expect(header.getCell(32).value).toBe(31);
    expect(wb.worksheets[0].pageSetup.orientation).toBe('landscape');
  });
});
