import {
  agruparPorTallaGenero,
  etiquetaGenero,
  totalGeneral,
  totalesPorGenero,
} from './item-report.resumen';

describe('resumen por talla y género del reporte por elemento', () => {
  it('normaliza el género para la administración (H/M/U, mujer, femenino…)', () => {
    expect(etiquetaGenero('M')).toBe('Hombre');
    expect(etiquetaGenero('H')).toBe('Hombre');
    expect(etiquetaGenero('f')).toBe('Mujer');
    expect(etiquetaGenero('FEMENINO')).toBe('Mujer');
    expect(etiquetaGenero('U')).toBe('Unisex');
    expect(etiquetaGenero(null)).toBe('—');
    expect(etiquetaGenero('')).toBe('—');
  });

  it('suma por talla + género + color + SKU y ordena por género/talla', () => {
    const filas = agruparPorTallaGenero([
      { talla: '38', genero: 'H', color: 'Azul', sku: 'OV-H-38-AZ', cantidad: 2 },
      { talla: '38', genero: 'H', color: 'Azul', sku: 'OV-H-38-AZ', cantidad: 3 },
      { talla: '36', genero: 'F', color: 'Azul', sku: 'OV-M-36-AZ', cantidad: 2 },
      { talla: '40', genero: 'H', color: 'Negro', sku: 'OV-H-40-NG', cantidad: 1 },
    ]);
    expect(filas).toEqual([
      { talla: '38', genero: 'Hombre', color: 'Azul', sku: 'OV-H-38-AZ', cantidad: 5 },
      { talla: '40', genero: 'Hombre', color: 'Negro', sku: 'OV-H-40-NG', cantidad: 1 },
      { talla: '36', genero: 'Mujer', color: 'Azul', sku: 'OV-M-36-AZ', cantidad: 2 },
    ]);
    expect(totalGeneral(filas)).toBe(8);
    expect(totalesPorGenero(filas)).toEqual([
      { genero: 'Hombre', cantidad: 6 },
      { genero: 'Mujer', cantidad: 2 },
    ]);
  });

  it('talla, género o color vacíos quedan como "—" para que no se pierdan en el total', () => {
    const filas = agruparPorTallaGenero([
      { talla: null, genero: null, color: null, sku: 'OV-OTRO', cantidad: 4 },
    ]);
    expect(filas).toEqual([
      { talla: '—', genero: '—', color: '—', sku: 'OV-OTRO', cantidad: 4 },
    ]);
    expect(totalGeneral(filas)).toBe(4);
  });
});
