import * as dns from 'dns';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as XLSX from 'xlsx';

dns.setDefaultResultOrder('ipv4first');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { Client } from 'pg';

const filePath = 'C:/Users/gdocumental/Downloads/SISTEMA DE GESTION/INDICADORES DE GESTION CORAZA SIG- ACT.xlsx';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl: url.includes('supabase') || url.includes('pooler') ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    const wb = XLSX.readFile(filePath);
    
    // Obtener todos los indicadores de la BD
    const indRes = await client.query('SELECT id, codigo, nombre, sentido FROM sig_indicadores');
    const indMap = new Map<string, { id: string; sentido: string }>();
    indRes.rows.forEach(r => indMap.set(r.codigo.toUpperCase(), { id: r.id, sentido: r.sentido }));

    console.log(`Indicadores en base de datos: ${indMap.size}`);

    let totalImported = 0;

    for (const sheetName of wb.SheetNames) {
      const code = sheetName.toUpperCase().trim();
      if (!indMap.has(code)) continue;

      const indInfo = indMap.get(code)!;
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];

      let headerIdx = -1;
      let colAnio = 0;
      let colMes = 1;
      let colMeta = 2;
      let colRes = 3;
      let colObs = 4;
      let colAcciones = 5;

      rows.forEach((r, idx) => {
        const rowStr = r.map(c => String(c).toUpperCase()).join(' ');
        if ((rowStr.includes('AÑO') || rowStr.includes('ANIO')) && (rowStr.includes('META') || rowStr.includes('RESULTADO'))) {
          headerIdx = idx;
          r.forEach((cell, cIdx) => {
            const h = String(cell).toUpperCase();
            if (h.includes('AÑO') || h.includes('ANIO')) colAnio = cIdx;
            if (h.includes('MES') || h.includes('PERIODO')) colMes = cIdx;
            if (h.includes('META')) colMeta = cIdx;
            if (h.includes('RESULTADO')) colRes = cIdx;
            if (h.includes('OBSERVACION') || h.includes('ANALISIS')) colObs = cIdx;
            if (h.includes('ACCION') || h.includes('PLAN')) colAcciones = cIdx;
          });
        }
      });

      if (headerIdx === -1) continue;

      let currentAnio = 2024;

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const anioVal = row[colAnio];
        if (anioVal && !isNaN(Number(anioVal)) && Number(anioVal) >= 2018 && Number(anioVal) <= 2030) {
          currentAnio = Number(anioVal);
        }

        const mesVal = String(row[colMes] || '').trim();
        const metaVal = row[colMeta];
        const resVal = row[colRes];

        if (mesVal === '' && (metaVal === '' || metaVal === undefined) && (resVal === '' || resVal === undefined)) {
          continue;
        }

        let numMeta = typeof metaVal === 'number' ? metaVal : parseFloat(String(metaVal).replace(',', '.').replace('%', ''));
        let numRes = typeof resVal === 'number' ? resVal : parseFloat(String(resVal).replace(',', '.').replace('%', ''));

        if (isNaN(numMeta)) numMeta = 1;
        if (isNaN(numRes)) continue; // Si no hay resultado, ignorar

        // Mapear período a formato corto (01 a 12, T1 a T4, o ENE-DIC)
        let periodoStr = '01';
        const mUpper = mesVal.toUpperCase();
        if (mUpper.includes('ENE') || mUpper.includes('ENERO')) periodoStr = '01';
        else if (mUpper.includes('FEB') || mUpper.includes('FEBRERO')) periodoStr = '02';
        else if (mUpper.includes('MAR') || mUpper.includes('MARZO')) periodoStr = '03';
        else if (mUpper.includes('ABR') || mUpper.includes('ABRIL')) periodoStr = '04';
        else if (mUpper.includes('MAY') || mUpper.includes('MAYO')) periodoStr = '05';
        else if (mUpper.includes('JUN') || mUpper.includes('JUNIO')) periodoStr = '06';
        else if (mUpper.includes('JUL') || mUpper.includes('JULIO')) periodoStr = '07';
        else if (mUpper.includes('AGO') || mUpper.includes('AGOSTO')) periodoStr = '08';
        else if (mUpper.includes('SEP') || mUpper.includes('SEPTIEMBRE')) periodoStr = '09';
        else if (mUpper.includes('OCT') || mUpper.includes('OCTUBRE')) periodoStr = '10';
        else if (mUpper.includes('NOV') || mUpper.includes('NOVIEMBRE')) periodoStr = '11';
        else if (mUpper.includes('DIC') || mUpper.includes('DICIEMBRE')) periodoStr = '12';
        else if (mUpper.includes('T1') || mUpper.includes('1 TRIMESTRE')) periodoStr = 'T1';
        else if (mUpper.includes('T2') || mUpper.includes('2 TRIMESTRE')) periodoStr = 'T2';
        else if (mUpper.includes('T3') || mUpper.includes('3 TRIMESTRE')) periodoStr = 'T3';
        else if (mUpper.includes('T4') || mUpper.includes('4 TRIMESTRE')) periodoStr = 'T4';
        else if (mUpper.includes('ENE-JUN')) periodoStr = 'S1';
        else if (mUpper.includes('JUL-DIC')) periodoStr = 'S2';
        else if (mUpper.includes('ANUAL') || mUpper.includes('ENERO-DICIEMBRE')) periodoStr = 'ANUAL';
        else if (mesVal.length > 0) periodoStr = mesVal.substring(0, 10);

        // Concatenar análisis y acciones
        let obsTxt = String(row[colObs] || '').trim();
        const accTxt = String(row[colAcciones] || '').trim();
        if (accTxt && accTxt !== obsTxt) {
          obsTxt = obsTxt ? `${obsTxt}\n\nAcciones tomadas: ${accTxt}` : `Acciones tomadas: ${accTxt}`;
        }

        // Calcular semáforo
        let color = 'VERDE';
        const pct = indInfo.sentido === 'ASCENDENTE' ? (numRes / numMeta) * 100 : (numMeta / numRes) * 100;
        if (pct >= 105) color = 'AZUL';
        else if (pct >= 90) color = 'VERDE';
        else if (pct >= 75) color = 'AMARILLO';
        else color = 'ROJO';

        // Upsert en la base de datos
        await client.query(`
          INSERT INTO sig_resultados (
            indicador_id, anio, periodo, meta_snapshot, valor_resultado, observaciones, color_semaforo, seguimiento, capturado_por, fecha_captura
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          ON CONFLICT (indicador_id, anio, periodo) DO UPDATE SET
            meta_snapshot = EXCLUDED.meta_snapshot,
            valor_resultado = EXCLUDED.valor_resultado,
            observaciones = EXCLUDED.observaciones,
            color_semaforo = EXCLUDED.color_semaforo,
            seguimiento = EXCLUDED.seguimiento;
        `, [
          indInfo.id,
          currentAnio,
          periodoStr,
          numMeta,
          numRes,
          obsTxt || null,
          color,
          'CERRADO',
          'Importación Excel SIG'
        ]);

        totalImported++;
      }
    }

    console.log(`\n✅ ¡Total de resultados y análisis históricos importados del Excel: ${totalImported}!`);
  } finally {
    await client.end();
  }
}

main().catch(console.error);
