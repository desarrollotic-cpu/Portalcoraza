import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import PDFDocument = require('pdfkit');
import { Repository } from 'typeorm';
import { Associate } from '../associates/entities/associate.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
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

    return this.renderPdf('Comprobante de entregas de dotación', async (doc) => {
      this.drawSectionBox(doc, () => {
        doc.fontSize(11).fillColor('#0f172a').text('Datos del asociado', { underline: true });
        doc.moveDown(0.35);
        doc.fontSize(10).fillColor('#0f172a').text(`Nombre: ${fullName}`);
        doc.text(`Documento: ${associate.documentNumber}`);
        doc
          .fontSize(9)
          .fillColor('#64748b')
          .text('Cada ficha incluye los elementos entregados y la firma de recibido del asociado.');
      });

      const deliveries = await this.deliveriesRepo.find({
        where: { associateId, status: DeliveryStatus.DELIVERED },
        relations: { details: { variant: { item: true } } },
        order: { deliveredAt: 'DESC' },
      });

      if (!deliveries.length) {
        doc.moveDown();
        doc.fontSize(10).fillColor('#64748b').text('El asociado no tiene entregas confirmadas.');
        return;
      }

      doc.moveDown(0.75);
      doc
        .fontSize(10)
        .fillColor('#475569')
        .text(`Total de entregas firmadas: ${deliveries.length}`);
      doc.moveDown(0.5);

      let index = 0;
      for (const delivery of deliveries) {
        index += 1;
        await this.drawDeliveryCard(doc, delivery, index, deliveries.length);
      }
    });
  }

  private async drawDeliveryCard(
    doc: PdfDoc,
    delivery: Delivery,
    index: number,
    total: number,
  ): Promise<void> {
    const date = delivery.deliveredAt ?? delivery.createdAt;
    const shortId = delivery.id.slice(0, 8).toUpperCase();
    const estimatedHeight = 170 + delivery.details.length * 14;

    if (doc.y + estimatedHeight > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
    }

    const startY = doc.y;
    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc
      .fontSize(12)
      .fillColor('#312e81')
      .text(`Entrega ${index} de ${total}`, left, startY, { width });
    doc
      .fontSize(9)
      .fillColor('#64748b')
      .text(`Fecha: ${this.formatDate(date)}   ·   Ref: ${shortId}`, { width });

    doc.moveDown(0.45);
    doc.fontSize(10).fillColor('#0f172a').text('Elementos entregados', { underline: true });
    doc.moveDown(0.25);

    if (!delivery.details?.length) {
      doc.fontSize(9).fillColor('#64748b').text('Sin detalle de ítems.');
    } else {
      for (const detail of delivery.details) {
        const itemName = detail.variant?.item?.name ?? 'Elemento';
        const sku = detail.variant?.sku ?? '—';
        doc
          .fontSize(10)
          .fillColor('#0f172a')
          .text(`• ${itemName}  |  SKU: ${sku}  |  Cantidad: ${detail.quantity} u.`, {
            width,
          });
      }
    }

    if (delivery.observations?.trim()) {
      doc.moveDown(0.35);
      doc.fontSize(9).fillColor('#475569').text(`Observaciones: ${delivery.observations.trim()}`, {
        width,
      });
    }

    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#0f172a').text('Firma del asociado (recibido)', { underline: true });
    doc.moveDown(0.3);

    const signatureBuffer = delivery.signatureUrl
      ? await this.fetchSignatureImage(delivery.signatureUrl)
      : null;

    const sigBoxX = left;
    const sigBoxY = doc.y;
    const sigBoxW = Math.min(260, width);
    const sigBoxH = 88;

    doc.rect(sigBoxX, sigBoxY, sigBoxW, sigBoxH).strokeColor('#cbd5e1').lineWidth(0.8).stroke();

    if (signatureBuffer) {
      try {
        doc.image(signatureBuffer, sigBoxX + 8, sigBoxY + 6, {
          fit: [sigBoxW - 16, sigBoxH - 12],
          align: 'center',
          valign: 'center',
        });
      } catch {
        doc
          .fontSize(9)
          .fillColor('#64748b')
          .text('Firma no disponible', sigBoxX + 12, sigBoxY + sigBoxH / 2 - 6);
      }
    } else {
      doc
        .fontSize(9)
        .fillColor('#64748b')
        .text('Firma no disponible', sigBoxX + 12, sigBoxY + sigBoxH / 2 - 6);
    }

    doc.y = sigBoxY + sigBoxH + 6;
    doc
      .fontSize(8)
      .fillColor('#64748b')
      .text('Firma de recibido — Portal Coraza / Dotación', left, doc.y, { width });

    doc.moveDown(0.85);
    doc
      .moveTo(left, doc.y)
      .lineTo(left + width, doc.y)
      .strokeColor('#e2e8f0')
      .lineWidth(0.6)
      .stroke();
    doc.moveDown(0.75);
  }

  private drawSectionBox(doc: PdfDoc, write: () => void): void {
    const left = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const top = doc.y;
    write();
    const bottom = doc.y + 4;
    doc
      .rect(left - 6, top - 6, width + 12, bottom - top + 8)
      .strokeColor('#e2e8f0')
      .lineWidth(0.8)
      .stroke();
    doc.y = bottom + 4;
  }

  private async fetchSignatureImage(url: string): Promise<Buffer | null> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!response.ok) return null;
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch {
      return null;
    }
  }

  private async renderPdf(title: string, write: (doc: PdfDoc) => Promise<void>): Promise<Buffer> {
    const doc = new PDFDocument({
      margin: 48,
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
}
