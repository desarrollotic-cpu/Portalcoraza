import { contractEmpty, otrosiEmpty, stripExcelId } from './post-agreements.util';

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

  it('quita solo el .0 de Excel y no pierde números reales', () => {
    expect(stripExcelId('1146.0')).toBe('1146');
    expect(stripExcelId('900123456.0')).toBe('900123456');
    expect(stripExcelId('  123.00  ')).toBe('123');
    expect(stripExcelId('00123.0')).toBe('00123');
    expect(stripExcelId('800.1')).toBe('800.1');
    expect(stripExcelId('12.05')).toBe('12.05');
    expect(stripExcelId('857-1')).toBe('857-1');
    expect(stripExcelId('857-2')).toBe('857-2');
    expect(stripExcelId('RET-95')).toBe('RET-95');
    expect(stripExcelId('1146.5')).toBe('1146.5');
  });
});
