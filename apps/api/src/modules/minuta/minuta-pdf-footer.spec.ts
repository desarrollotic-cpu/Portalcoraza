import PDFDocument = require('pdfkit');
import { MinutaService } from './minuta.service';

describe('MinutaService drawMinutaPdfFooter', () => {
  const service = Object.create(MinutaService.prototype) as MinutaService;
  const draw = (
    doc: InstanceType<typeof PDFDocument>,
    page: number,
    total: number,
  ) =>
    (
      service as unknown as {
        drawMinutaPdfFooter(
          d: InstanceType<typeof PDFDocument>,
          p: number,
          t: number,
        ): void;
      }
    ).drawMinutaPdfFooter(doc, page, total);

  it('does not open extra pages when drawing footer in bottom margin', () => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 48, left: 48, right: 48, bottom: 100 },
      bufferPages: true,
    });
    doc.on('data', () => undefined);

    doc.text('contenido corto', { width: 400 });
    draw(doc, 1, 1);

    expect(doc.bufferedPageRange().count).toBe(1);
    doc.end();
  });
});
