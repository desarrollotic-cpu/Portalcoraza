import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import PDFDocument from 'pdfkit';
import { Repository } from 'typeorm';
import { Associate } from '../associates/entities/associate.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { DeliveryDetail } from './entities/delivery-detail.entity';
import { Delivery, DeliveryStatus } from './entities/delivery.entity';

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

      doc.fontSize(12).text('Totales por elemento', { underline: true });
      doc.moveDown(0.5);
      if (!totals.length) {
        doc.text('No hay entregas confirmadas.');
      } else {
        for (const row of totals) {
          doc.text(`${row.itemName} (${row.sku}): ${row.totalQuantity} unidades`);
        }
      }

      doc.moveDown();
      doc.fontSize(12).text('Detalle de entregas', { underline: true });
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
        doc.text('Sin detalle.');
        return;
      }

      for (const line of lines) {
        const date = line.delivery.deliveredAt ?? line.delivery.createdAt;
        const associate = line.delivery.associate
          ? this.formatAssociate(line.delivery.associate)
          : 'Puesto / sin asociado';
        doc.fontSize(10).text(
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
        doc.text('No hay entregas confirmadas para este elemento.');
        return;
      }

      let total = 0;
      for (const line of lines) {
        total += line.quantity;
        const date = line.delivery.deliveredAt ?? line.delivery.createdAt;
        const associate = line.delivery.associate
          ? this.formatAssociate(line.delivery.associate)
          : 'Puesto / sin asociado';
        doc.fontSize(10).text(
          `${this.formatDate(date)} | ${associate} | ${line.variant.sku} | Cant: ${line.quantity}`,
        );
      }
      doc.moveDown();
      doc.fontSize(11).text(`Total entregado: ${total} unidades`);
    });
  }

  async buildAssociateReport(associateId: string): Promise<Buffer> {
    const associate = await this.associatesRepo.findOne({ where: { id: associateId } });
    if (!associate) {
      throw new NotFoundException('Asociado no encontrado');
    }

    return this.renderPdf(
      `Reporte individual: ${this.formatAssociate(associate)}`,
      async (doc) => {
        doc.fontSize(10).text(`Documento: ${associate.documentNumber}`);
        doc.moveDown();

        const deliveries = await this.deliveriesRepo.find({
          where: { associateId, status: DeliveryStatus.DELIVERED },
          relations: { details: { variant: { item: true } } },
          order: { deliveredAt: 'DESC' },
        });

        if (!deliveries.length) {
          doc.text('El asociado no tiene entregas confirmadas.');
          return;
        }

        for (const delivery of deliveries) {
          const date = delivery.deliveredAt ?? delivery.createdAt;
          doc.fontSize(11).text(`Entrega ${this.formatDate(date)}`, { underline: true });
          if (delivery.observations?.trim()) {
            doc.fontSize(10).text(`Observaciones: ${delivery.observations.trim()}`);
          }
          for (const detail of delivery.details) {
            doc.fontSize(10).text(
              `• ${detail.variant.item.name} (${detail.variant.sku}) — ${detail.quantity} u.`,
            );
          }
          doc.moveDown(0.5);
        }
      },
    );
  }

  private async renderPdf(
    title: string,
    write: (doc: InstanceType<typeof PDFDocument>) => Promise<void>,
  ): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    doc.fontSize(16).text('Portal Coraza — Dotación', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(13).text(title, { align: 'center' });
    doc.fontSize(9).text(`Generado: ${this.formatDate(new Date())}`, { align: 'center' });
    doc.moveDown();

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
