import {
  buildPlanillaWorkbook,
  excelSheetName,
  formatPlanillaCode,
  hoursBetween,
} from './planilla-excel';

describe('planilla-excel', () => {
  it('sanitizes sheet names and keeps them unique', () => {
    const used = new Set<string>();
    expect(excelSheetName('Puesto/808', used)).toBe('Puesto 808');
    expect(excelSheetName('Puesto 808', used)).toBe('Puesto 808 (2)');
  });

  it('labels codes with hours (D12 N12 D8 N8 D9 N9)', () => {
    expect(formatPlanillaCode('D')).toBe('D12');
    expect(formatPlanillaCode('N')).toBe('N12');
    expect(formatPlanillaCode('D8')).toBe('D8');
    expect(formatPlanillaCode('N8')).toBe('N8');
    expect(formatPlanillaCode('D', '06:00', '15:00')).toBe('D9');
    expect(formatPlanillaCode('N', '18:00', '03:00')).toBe('N9');
    expect(formatPlanillaCode('DR')).toBe('DR');
    expect(hoursBetween('06:00', '18:00')).toBe(12);
    expect(hoursBetween('18:00', '06:00')).toBe(12);
  });

  it('one sheet per post, day 31, and D→D12 in cells', () => {
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
              codes: Array.from({ length: 31 }, () => ({
                codigo: 'N',
                inicio: '18:00',
                fin: '06:00',
              })),
            },
          ],
        },
      ],
    });
    expect(wb.worksheets).toHaveLength(2);
    const header = wb.worksheets[0].getRow(6);
    expect(header.getCell(2).value).toBe(1);
    expect(header.getCell(32).value).toBe(31);
    expect(wb.worksheets[0].getRow(7).getCell(2).value).toBe('D12');
    expect(wb.worksheets[1].getRow(7).getCell(2).value).toBe('N12');
    expect(wb.worksheets[0].pageSetup.orientation).toBe('landscape');
  });
});
