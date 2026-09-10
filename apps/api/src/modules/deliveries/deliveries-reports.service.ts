import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import PDFDocument = require('pdfkit');
import { Repository } from 'typeorm';
import { Associate } from '../associates/entities/associate.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { DeliveriesService } from './deliveries.service';
import { getDotacionEncabezadoBuffer } from './dotacion-pdf-assets';
import { DeliveryDetail } from './entities/delivery-detail.entity';
import { Delivery, DeliveryStatus } from './entities/delivery.entity';

type PdfDoc = InstanceType<typeof PDFDocument>;

@Injectable()
export class DeliveriesReportsService {
  constructor(
    @InjectRepository(Delivery)
    private readonly deliveriesRepo: Repository<Delivery>,
    @InjectRepository(DeliveryDetail)
    private readonly detailsRepo: Repository<DeliveryDetail>,
    @InjectRepository(Associate)
    private readonly associatesRepo: Repository<Associate>,
    @InjectRepository(InventoryItem)
    private readonly itemsRepo: Repository<InventoryItem>,
    private readonly deliveriesService: DeliveriesService,
  ) {}

  buildGeneralReport(): Promise<Buffer> {
    return this.renderPdf('Reporte general por elementos', async (doc) => {
      const totals = await this.detailsRepo
        .createQueryBuilder('dd')
        .innerJoin('dd.delivery', 'd')
        .innerJoin('dd.variant', 'v')
        .innerJoin('v.item', 'item')
        .where('d.status = :status', { status: DeliveryStatus.DELIVERED })
        .select('item.name', 'itemName')
        .addSelect('v.sku', 'sku')
        .addSelect('SUM(dd.quantity)', 'totalQuantity')
        .groupBy('item.id')
        .addGroupBy('item.name')
        .addGroupBy('v.sku')
        .orderBy('SUM(dd.quantity)', 'DESC')
        .getRawMany<{ itemName: string; sku: string; totalQuantity: string }>();

      doc.fontSize(12).fillColor('#0f172a').text('Totales por elemento', { underline: true });
      doc.moveDown(0.5);
      if (!totals.length) {
        doc.fontSize(10).fillColor('#64748b').text('No hay entregas confirmadas.');
      } else {
        for (const row of totals) {
          doc
            .fontSize(10)
            .fillColor('#0f172a')
            .text(`${row.itemName} (${row.sku}): ${row.totalQuantity} unidades`);
        }
      }

      doc.moveDown();
      doc.fontSize(12).fillColor('#0f172a').text('Detalle de entregas', { underline: true });
      doc.moveDown(0.5);

      const lines = await this.detailsRepo
        .createQueryBuilder('dd')
        .innerJoinAndSelect('dd.delivery', 'd')
        .innerJoinAndSelect('dd.variant', 'v')
        .innerJoinAndSelect('v.item', 'item')
        .leftJoinAndSelect('d.associate', 'a')
        .where('d.status = :status', { status: DeliveryStatus.DELIVERED })
        .orderBy('d.delivered_at', 'DESC')
        .getMany();

      if (!lines.length) {
        doc.fontSize(10).fillColor('#64748b').text('Sin detalle.');
        return;
      }

      for (const line of lines) {
        const date = line.delivery.deliveredAt ?? line.delivery.createdAt;
        const associate = line.delivery.associate
          ? this.formatAssociate(line.delivery.associate)
          : 'Puesto / sin asociado';
        doc
          .fontSize(10)
          .fillColor('#0f172a')
          .text(
            `${this.formatDate(date)} | ${associate} | ${line.variant.item.name} (${line.variant.sku}) | Cant: ${line.quantity}`,
          );
      }
    });
  }

  async buildItemReport(itemId: string): Promise<Buffer> {
    const item = await this.itemsRepo.findOne({ where: { id: itemId } });
    if (!item) {
      throw new NotFoundException('Elemento de inventario no encontrado');
    }

    return this.renderPdf(`Reporte por elemento: ${item.name}`, async (doc) => {
      const lines = await this.detailsRepo
        .createQueryBuilder('dd')
        .innerJoinAndSelect('dd.delivery', 'd')
        .innerJoinAndSelect('dd.variant', 'v')
        .innerJoinAndSelect('v.item', 'item')
        .leftJoinAndSelect('d.associate', 'a')
        .where('d.status = :status', { status: DeliveryStatus.DELIVERED })
        .andWhere('item.id = :itemId', { itemId })
        .orderBy('d.delivered_at', 'DESC')
        .getMany();

      if (!lines.length) {
        doc.fontSize(10).fillColor('#64748b').text('No hay entregas confirmadas para este elemento.');
        return;
      }

      let total = 0;
      for (const line of lines) {
        total += line.quantity;
        const date = line.delivery.deliveredAt ?? line.delivery.createdAt;
        const associate = line.delivery.associate
          ? this.formatAssociate(line.delivery.associate)
          : 'Puesto / sin asociado';
        doc
          .fontSize(10)
          .fillColor('#0f172a')
          .text(
            `${this.formatDate(date)} | ${associate} | ${line.variant.sku} | Cant: ${line.quantity}`,
          );
      }
      doc.moveDown();
      doc.fontSize(11).fillColor('#0f172a').text(`Total entregado: ${total} unidades`);
    });
  }

  async buildAssociateReport(associateId: string): Promise<Buffer> {
    const associate = await this.associatesRepo.findOne({ where: { id: associateId } });
    if (!associate) {
      throw new NotFoundException('Asociado no encontrado');
    }

    const fullName = this.formatAssociate(associate);
    const now = new Date();
    const semester = now.getMonth() < 6 ? 1 : 2;
    const periodLabel = `Semestre ${semester} ${now.getFullYear()}`;

    return this.renderPdf(
      'REPORTE DE ENTREGAS DE DOTACIÓN',
      async (doc) => {
        doc.fontSize(11).fillColor('#0f172a').text(`Asociado: ${fullName}`);
        doc.text(`Cédula: ${associate.documentNumber}`);
        doc.text(`Periodo: ${periodLabel}`);
        doc
          .fontSize(9)
          .fillColor('#64748b')
          .text(`Fecha de generación: ${this.formatDateOnly(now)}`);
        doc.moveDown(0.75);

        const deliveries = await this.deliveriesRepo.find({
          where: { associateId, status: DeliveryStatus.DELIVERED },
          relations: { details: { variant: { item: true } } },
          order: { deliveredAt: 'DESC' },
        });

        if (!deliveries.length) {
          doc.fontSize(10).fillColor('#64748b').text('El asociado no tiene entregas confirmadas.');
          return;
        }

        const left = doc.page.margins.left;
        const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const cols = this.associateTableCols(left, width);
        this.drawAssociateTableHeader(doc, cols);

        const totals = new Map<string, number>();

        for (const delivery of deliveries) {
          for (const detail of delivery.details ?? []) {
            const label = this.detailLabel(detail);
            totals.set(label, (totals.get(label) ?? 0) + detail.quantity);
          }
          await this.drawAssociateTableRow(doc, delivery, cols);
        }

        doc.moveDown(0.6);
        doc.fontSize(11).fillColor('#0f172a').text('RESUMEN:', { underline: true });
        doc.moveDown(0.3);
        for (const [label, qty] of [...totals.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es'))) {
          doc.fontSize(10).fillColor('#0f172a').text(`• ${label}: ${qty} unidad(es)`);
        }
        doc.moveDown(0.8);
        doc
          .fontSize(8)
          .fillColor('#64748b')
          .text('Sistema de Control de Dotaciones - Coraza', { align: 'center' });
      },
      { foTh51Header: true },
    );
  }

  private associateTableCols(left: number, width: number) {
    const fechaW = 70;
    const cantW = 36;
    const firmaW = 110;
    const obsW = 90;
    const elemW = width - fechaW - cantW - firmaW - obsW;
    return {
      left,
      width,
      fecha: { x: left, w: fechaW },
      elemento: { x: left + fechaW, w: elemW },
      cant: { x: left + fechaW + elemW, w: cantW },
      obs: { x: left + fechaW + elemW + cantW, w: obsW },
      firma: { x: left + fechaW + elemW + cantW + obsW, w: firmaW },
    };
  }

  private drawAssociateTableHeader(
    doc: PdfDoc,
    cols: ReturnType<DeliveriesReportsService['associateTableCols']>,
  ): void {
    const y = doc.y;
    const h = 18;
    doc.rect(cols.left, y, cols.width, h).fillAndStroke('#e2e8f0', '#94a3b8');
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold');
    doc.text('Fecha', cols.fecha.x + 3, y + 5, { width: cols.fecha.w - 6 });
    doc.text('Elemento', cols.elemento.x + 3, y + 5, { width: cols.elemento.w - 6 });
    doc.text('Cant.', cols.cant.x + 3, y + 5, { width: cols.cant.w - 6 });
    doc.text('Observaciones', cols.obs.x + 3, y + 5, { width: cols.obs.w - 6 });
    doc.text('Firma', cols.firma.x + 3, y + 5, { width: cols.firma.w - 6 });
    doc.font('Helvetica');
    doc.y = y + h + 2;
  }

  private detailLabel(detail: DeliveryDetail): string {
    const itemName = detail.variant?.item?.name ?? 'Elemento';
    const sku = detail.variant?.sku?.trim();
    if (sku && !itemName.toLowerCase().includes(sku.toLowerCase())) {
      return `${itemName} - ${sku}`;
    }
    return itemName;
  }

  private async drawAssociateTableRow(
    doc: PdfDoc,
    delivery: Delivery,
    cols: ReturnType<DeliveriesReportsService['associateTableCols']>,
  ): Promise<void> {
    const date = delivery.deliveredAt ?? delivery.createdAt;
    const details = delivery.details ?? [];
    const lines = details.length
      ? details.map((d) => this.detailLabel(d))
      : ['Sin detalle'];
    const qtyLines = details.length ? details.map((d) => String(d.quantity)) : ['—'];
    const obs = (delivery.observations ?? '').trim() || '—';

    const lineH = 12;
    const textBlockH = Math.max(lines.length, 1) * lineH;
    const firmaH = 56;
    const pad = 6;
    const rowH = Math.max(textBlockH, firmaH) + pad * 2;

    if (doc.y + rowH > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      this.drawAssociateTableHeader(doc, cols);
    }

    const y = doc.y;
    doc.rect(cols.left, y, cols.width, rowH).strokeColor('#cbd5e1').lineWidth(0.6).stroke();

    doc
      .fontSize(8)
      .fillColor('#0f172a')
      .text(this.formatDateOnly(date), cols.fecha.x + 3, y + pad, {
        width: cols.fecha.w - 6,
      });

    let elemY = y + pad;
    for (const line of lines) {
      doc.text(line, cols.elemento.x + 3, elemY, { width: cols.elemento.w - 6 });
      elemY += lineH;
    }

    let cantY = y + pad;
    for (const q of qtyLines) {
      doc.text(q, cols.cant.x + 3, cantY, { width: cols.cant.w - 6, align: 'center' });
      cantY += lineH;
    }

    doc.text(obs, cols.obs.x + 3, y + pad, { width: cols.obs.w - 6 });

    const signatureBuffer = delivery.signatureUrl
      ? await this.fetchSignatureImage(delivery.signatureUrl)
      : null;
    const sigX = cols.firma.x + 4;
    const sigY = y + pad;
    const sigW = cols.firma.w - 8;
    const sigH = rowH - pad * 2;
    doc.rect(sigX, sigY, sigW, sigH).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
    if (signatureBuffer) {
      try {
        doc.image(signatureBuffer, sigX + 2, sigY + 2, {
          fit: [sigW - 4, sigH - 4],
          align: 'center',
          valign: 'center',
        });
      } catch {
        doc
          .fontSize(7)
          .fillColor('#64748b')
          .text('Sin firma', sigX + 4, sigY + sigH / 2 - 4, { width: sigW - 8 });
      }
    } else {
      doc
        .fontSize(7)
        .fillColor('#64748b')
        .text('Sin firma', sigX + 4, sigY + sigH / 2 - 4, { width: sigW - 8 });
    }

    doc.y = y + rowH;
  }

  private async fetchSignatureImage(storedUrl: string): Promise<Buffer | null> {
    try {
      const { data } = await this.deliveriesService.downloadSignatureByStoredUrl(storedUrl);
      return data;
    } catch {
      return null;
    }
  }

  private async renderPdf(
    title: string,
    write: (doc: PdfDoc) => Promise<void>,
    opts?: { foTh51Header?: boolean },
  ): Promise<Buffer> {
    const doc = new PDFDocument({
      margin: opts?.foTh51Header ? 36 : 48,
      size: 'A4',
      info: {
        Title: title,
        Author: 'Portal Coraza',
        Subject: 'Dotación',
      },
    });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    if (opts?.foTh51Header) {
      const maxW = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const top = doc.y;
      doc.image(getDotacionEncabezadoBuffer(), doc.page.margins.left, top, { width: maxW });
      // pdfkit no avanza Y con x/y explícitos: alto aprox. del banner FO-TH-51
      doc.y = top + Math.round(maxW * (128 / 742)) + 8;
      doc.moveDown(0.35);
    } else {
      doc.fontSize(16).fillColor('#312e81').text('Portal Coraza — Dotación', { align: 'center' });
      doc.moveDown(0.35);
      doc.fontSize(13).fillColor('#0f172a').text(title, { align: 'center' });
      doc
        .fontSize(9)
        .fillColor('#64748b')
        .text(`Generado: ${this.formatDate(new Date())}`, { align: 'center' });
      doc.moveDown(0.85);
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .strokeColor('#c7d2fe')
        .lineWidth(1)
        .stroke();
      doc.moveDown(0.85);
    }

    await write(doc);
    doc.end();
    return finished;
  }

  private formatAssociate(a: Associate): string {
    return [a.firstName, a.secondName, a.firstLastName, a.secondLastName]
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  private formatDate(value: Date): string {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(value);
  }

  private formatDateOnly(value: Date): string {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short' }).format(value);
  }
}
