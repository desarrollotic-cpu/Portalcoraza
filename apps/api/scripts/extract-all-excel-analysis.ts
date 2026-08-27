import * as XLSX from 'xlsx';

const filePath = 'C:/Users/gdocumental/Downloads/SISTEMA DE GESTION/INDICADORES DE GESTION CORAZA SIG- ACT.xlsx';
const wb = XLSX.readFile(filePath);

console.log('=== BUSCANDO OBSERVACIONES / ANÁLISIS EN CADA HOJA ===');

const indSheets = ['E1', 'E2', 'E3', 'E4', 'H1', 'H2', 'H3', 'H4', 'S1', 'S2', 'S3', 'S4', 'S5', 'C1', 'C2', 'C3', 'C4', 'P1', 'P2', 'P3', 'I1', 'I2', 'I3', 'I4', 'O1', 'O2', 'O3', 'O4'];

indSheets.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  if (!ws) return;
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
  
  console.log(`\n--- HOJA ${sheetName} ---`);
  // Buscar encabezado con AÑO, MES, META, RESULTADO, OBSERVACIONES
  let headerIdx = -1;
  rows.forEach((r, idx) => {
    const str = r.map(c => String(c).toUpperCase()).join(' ');
    if ((str.includes('AÑO') || str.includes('ANIO')) && (str.includes('META') || str.includes('RESULTADO'))) {
      headerIdx = idx;
    }
  });

  if (headerIdx !== -1) {
    console.log(`Encabezado en Fila ${headerIdx + 1}:`, rows[headerIdx].filter(Boolean));
    rows.slice(headerIdx + 1, headerIdx + 10).forEach((r, idx) => {
      const line = r.filter(c => String(c).trim() !== '').join(' | ');
      if (line) console.log(`  [Dato ${idx + 1}] ${line.substring(0, 150)}...`);
    });
  } else {
    console.log('No se detectó tabla estándar. Primeras filas:');
    rows.slice(0, 5).forEach((r, idx) => console.log(`  [F${idx + 1}]`, r.filter(Boolean)));
  }
});
