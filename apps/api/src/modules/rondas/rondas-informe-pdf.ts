import PDFDocument = require('pdfkit');
import { fmtFechaHoraBogota, minutosEntre, RondaInforme } from './rondas-informe';

/**
 * PDF del informe mensual de un puesto. Dos secciones: resumen con los
 * numeros que la administracion firma y detalle de cada recorrido con sus
 * puntos. Simple a proposito: lo imprimen y lo entregan.
 */
export function renderInformePDF(data: {
  puesto: string;
  mesLabel: string;
  generado: string;
  rondas: RondaInforme[];
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc
      .fontSize(16)
      .fillColor('#312e81')
      .text('Portal Coraza — Informe mensual de rondas', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor('#0f172a').text(data.puesto, { align: 'center' });
    doc
      .fontSize(9)
      .fillColor('#64748b')
      .text(`Mes ${data.mesLabel} · generado ${data.generado}`, { align: 'center' });
    doc.moveDown(0.8);

    const total = data.rondas.length;
    const completas = data.rondas.filter((r) => r.completa).length;
    const incompletas = data.rondas.filter((r) => !r.completa && !r.abierta).length;
    const abiertas = data.rondas.filter((r) => r.abierta).length;

    doc.fontSize(11).fillColor('#0f172a').text('Resumen del mes', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#0f172a');
    doc.text(`Recorridos: ${total}`);
    doc.text(`Completos: ${completas}`);
    doc.text(`Incompletos: ${incompletas}`);
    if (abiertas) doc.text(`En curso: ${abiertas}`);
    doc.moveDown(0.6);

    if (!total) {
      doc.fontSize(10).fillColor('#64748b').text('Sin recorridos en este mes.');
      doc.end();
      return;
    }

    // Agrupacion por ronda (nombre del circuito) para que la administracion
    // vea cada ronda del puesto en bloque.
    const porRonda = new Map<string, RondaInforme[]>();
    for (const r of data.rondas) {
      const list = porRonda.get(r.rondaNombre) ?? [];
      list.push(r);
      porRonda.set(r.rondaNombre, list);
    }

    for (const [nombre, lista] of porRonda) {
      doc.moveDown(0.4);
      doc.fontSize(12).fillColor('#312e81').text(`Ronda: ${nombre}`);
      doc
        .fontSize(9)
        .fillColor('#64748b')
        .text(
          `${lista.length} recorrido${lista.length === 1 ? '' : 's'} · ${lista.filter((x) => x.completa).length} completos · puntos del circuito: ${lista[0]?.esperados ?? 0}`,
        );
      doc.moveDown(0.3);

      for (const r of lista) {
        if (doc.y > doc.page.height - 120) doc.addPage();
        const estado = r.abierta ? 'En curso' : r.completa ? 'Completa' : 'Incompleta';
        const minutos = r.abierta ? '—' : `${minutosEntre(r.inicio, r.fin)} min`;
        doc
          .fontSize(10)
          .fillColor('#0f172a')
          .text(
            `• ${r.fecha} · ronda ${r.numeroDia} del día · ${estado} · ${r.puntos.length}/${r.esperados} puntos · ${minutos}`,
          );
        doc.fontSize(9).fillColor('#334155');
        doc.text(`   Inicio: ${fmtFechaHoraBogota(r.inicio)}`);
        doc.text(`   Fin: ${r.abierta ? 'En curso' : fmtFechaHoraBogota(r.fin)}`);
        if (r.puntos.length) {
          for (const p of r.puntos) {
            if (doc.y > doc.page.height - 60) doc.addPage();
            doc
              .fontSize(9)
              .fillColor('#0f172a')
              .text(`   ${p.puntoOrden}. ${p.puntoNombre} — ${fmtFechaHoraBogota(p.fechaHora)}`);
          }
        } else {
          doc.fontSize(9).fillColor('#b91c1c').text('   Sin marcas registradas en este recorrido.');
        }
        doc.moveDown(0.3);
      }
    }

    doc.end();
  });
}
