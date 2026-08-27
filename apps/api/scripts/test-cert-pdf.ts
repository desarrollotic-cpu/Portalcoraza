import * as fs from 'fs';
import * as path from 'path';
import PDFDocument = require('pdfkit');
import {
  getMembreteHuellaBuffer,
  getMembreteIsoBuffer,
  getMembreteLogoBuffer,
} from '../src/modules/associates/membrete-assets';

const doc = new PDFDocument({ size: 'LETTER', margins: { top: 40, bottom: 40, left: 55, right: 55 } });
const outPdf = path.join(__dirname, 'test-cert-output.pdf');
const stream = fs.createWriteStream(outPdf);
doc.pipe(stream);

// Franja superior azul corporativa
doc.rect(0, 0, 612, 10).fill('#1d4ed8');

// Logo Oficial Coraza en Memoria
const logoBuf = getMembreteLogoBuffer();
doc.image(logoBuf, 55, 18, { width: 54, height: 54 });

const headerTextX = 118;

// Encabezado Corporativo Oficial 2025
doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('CORAZA SEGURIDAD C.T.A.', headerTextX, 22);
doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1d4ed8').text('La Seguridad un Compromiso de Todos', headerTextX, 39);
doc.fontSize(7.5).font('Helvetica').fillColor('#64748b').text('NIT: 811.026.837-1 · VIGILADO Supervigilancia Resolución 6889 del 29 de septiembre de 2011', headerTextX, 52);

doc.strokeColor('#1d4ed8').lineWidth(1.5).moveTo(55, 82).lineTo(557, 82).stroke();
doc.y = 98;
doc.moveDown(1);

// Título
doc.rect(55, doc.y, 502, 24).fill('#f1f5f9');
doc.fillColor('#1e293b').fontSize(10.5).font('Helvetica-Bold').text('EL DEPARTAMENTO DE GESTIÓN HUMANA Y BIENESTAR LABORAL', 55, doc.y - 17, { align: 'center' });
doc.moveDown(1.5);

doc.fillColor('#0f172a').fontSize(13).font('Helvetica-Bold').text('CERTIFICA:', { align: 'center' });
doc.moveDown(1.2);

doc.fontSize(10.5).font('Helvetica').fillColor('#334155').lineGap(5);
doc.text(
  `Que el(la) señor(a) JAIRO HUMBERTO ACEVEDO LOAIZA, identificado(a) con Cédula de Ciudadanía No. 10531748, se encuentra vinculado(a) a nuestra cooperativa en calidad de ASOCIADO(A) TRABAJADOR(A) desde el 14 de diciembre de 2023, desempeñando actualmente las funciones correspondientes al cargo de:`,
  55,
  doc.y,
  { align: 'justify', width: 502 }
);
doc.moveDown(0.8);

const boxY = doc.y;
doc.rect(55, boxY, 502, 70).fillAndStroke('#f8fafc', '#cbd5e1');
doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold');
doc.text(`• CARGO / ESPECIALIDAD:`, 75, boxY + 12);
doc.font('Helvetica').fillColor('#1e293b').text(`VIGILANTE`, 235, boxY + 12);

doc.font('Helvetica-Bold').fillColor('#0f172a').text(`• CENTRO DE ASIGNACIÓN:`, 75, boxY + 30);
doc.font('Helvetica').fillColor('#1e293b').text(`SEDE PRINCIPAL`, 235, boxY + 30);

doc.font('Helvetica-Bold').fillColor('#0f172a').text(`• ESTADO OPERATIVO:`, 75, boxY + 48);
doc.font('Helvetica').fillColor('#047857').text(`ACTIVO(A)`, 235, boxY + 48);

doc.y = boxY + 84;
doc.moveDown(1);
doc.fillColor('#334155').fontSize(10.5).font('Helvetica').text(
  `Durante el tiempo de su vinculación, ha demostrado un estricto cumplimiento de los deberes cooperativos, principios de lealtad, disciplina y estándares de seguridad privada exigidos por la legislación colombiana y la Superintendencia de Vigilancia y Seguridad Privada.`,
  55,
  doc.y,
  { align: 'justify', width: 502 }
);
doc.moveDown(1);
doc.text(
  `El presente certificado se expide a solicitud de la parte interesada en la ciudad de Medellín, a los 27 de agosto de 2026.`,
  55,
  doc.y,
  { align: 'justify', width: 502 }
);
doc.moveDown(3);

// Firma Autorizada
const sigY = doc.y;
doc.strokeColor('#94a3b8').lineWidth(1).moveTo(55, sigY).lineTo(250, sigY).stroke();
doc.fillColor('#0f172a').fontSize(9.5).font('Helvetica-Bold').text('GESTIÓN HUMANA Y BIENESTAR', 55, sigY + 6);
doc.fontSize(8.5).font('Helvetica').fillColor('#64748b').text('Coraza Seguridad C.T.A.', 55, sigY + 18);
doc.text('PBX: (604) 4447929 · Medellín, Colombia', 55, sigY + 28);

// Sellos de certificación oficiales en Memoria
const isoBuf = getMembreteIsoBuffer();
const huellaBuf = getMembreteHuellaBuffer();
doc.image(isoBuf, 410, sigY - 6, { height: 38 });
doc.image(huellaBuf, 485, sigY - 2, { height: 32 });

// Pie de Página Membrete Oficial 2025
doc.strokeColor('#1d4ed8').lineWidth(1.5).moveTo(55, 735).lineTo(557, 735).stroke();
doc.fontSize(7.5).font('Helvetica').fillColor('#64748b').text('📧 info@corazaseguridadcta.com   |   🌐 www.corazaseguridadcta.com   |   📞 PBX: (604) 4447929   |   📍 Medellín - Colombia', 55, 742, { align: 'center' });
doc.rect(0, 782, 612, 10).fill('#1d4ed8');

doc.end();

stream.on('finish', () => {
  console.log('Test PDF generated successfully! File size:', fs.statSync(outPdf).size, 'bytes');
});
