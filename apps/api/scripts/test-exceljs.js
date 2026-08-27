const dns = require('dns');
const dotenv = require('dotenv');
const path = require('path');
const { Client } = require('pg');
const ExcelJS = require('exceljs');

dns.setDefaultResultOrder('ipv4first');
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testExportExcel() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Test');
  ws.mergeCells('A1:N1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'CORAZA';
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  const buffer = await wb.xlsx.writeBuffer();
  console.log('Excel writeBuffer buffer size:', buffer.byteLength);
}

testExportExcel().catch(console.error);
