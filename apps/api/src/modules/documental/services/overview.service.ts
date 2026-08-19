import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Contract } from '../entities/contract.entity';
import { Correspondence } from '../entities/correspondence.entity';
import { Loan } from '../entities/loan.entity';
import { Minute } from '../entities/minute.entity';
import { RetentionItem } from '../entities/retention-item.entity';
import { RetiredPersonnel } from '../entities/retired-personnel.entity';

export interface SearchResult {
  modulo: string;
  titulo: string;
  codigo: string;
  fecha: string | null;
  id: string;
  voxelsera: string | null;
}

/** Slot físico: 4 estantes (A-D) x 9 compartimentos. */
const SHELVES = ['A', 'B', 'C', 'D'] as const;
const SLOTS_PER_SHELF = 9;

@Injectable()
export class OverviewService {
  constructor(
    @InjectRepository(RetentionItem)
    private readonly trdRepo: Repository<RetentionItem>,
    @InjectRepository(Contract)
    private readonly contractsRepo: Repository<Contract>,
    @InjectRepository(Correspondence)
    private readonly correspondenceRepo: Repository<Correspondence>,
    @InjectRepository(Minute)
    private readonly minutesRepo: Repository<Minute>,
    @InjectRepository(RetiredPersonnel)
    private readonly retiredRepo: Repository<RetiredPersonnel>,
    @InjectRepository(Loan)
    private readonly loansRepo: Repository<Loan>,
  ) {}

  listTrd() {
    return this.trdRepo.find({ order: { dependencyCode: 'ASC' } });
  }

  /**
   * Aplica un WHERE multi-palabra: cada palabra debe aparecer (AND) en alguna
   * de las columnas (OR). Igual comportamiento que la búsqueda universal del SGD.
   */
  private applyWords<T extends import('typeorm').ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    words: string[],
    columns: string[],
  ): SelectQueryBuilder<T> {
    words.forEach((word, i) => {
      const param = `w${i}`;
      const ors = columns
        .map((c) => `COALESCE(${c}::text, '') ILIKE :${param}`)
        .join(' OR ');
      qb.andWhere(`(${ors})`, { [param]: `%${word}%` });
    });
    return qb;
  }

  async search(query: string): Promise<{ resultados: SearchResult[]; total: number }> {
    const clean = (query || '').replace(/^#/, '').trim();
    const words = clean.split(/\s+/).filter((w) => w.length > 0);
    if (words.length === 0) {
      return { resultados: [], total: 0 };
    }

    const resultados: SearchResult[] = [];

    const contracts = await this.applyWords(
      this.contractsRepo.createQueryBuilder('c'),
      words,
      ['c.contract_number', 'c.party_a', 'c.party_b', 'c.nit', 'c.contract_object', 'c.contract_type', 'c.numeric_code', 'c.voxelsera', 'c.status'],
    )
      .orderBy('c.numeric_code', 'ASC')
      .limit(80)
      .getMany();
    contracts.forEach((r) =>
      resultados.push({
        modulo: 'CONTRATOS',
        titulo: `${r.partyB || r.contractType || 'Contrato'}${r.nit ? ` (NIT: ${r.nit})` : ''}`,
        codigo: `#${r.numericCode ?? 'S/N'} · ${r.contractNumber ?? r.id}`,
        fecha: r.startDate,
        id: r.id,
        voxelsera: r.voxelsera,
      }),
    );

    const correspondence = await this.applyWords(
      this.correspondenceRepo.createQueryBuilder('c'),
      words,
      ['c.document_code', 'c.subject', 'c.detail', 'c.origin_dept', 'c.destination_dept', 'c.document_type', 'c.voxelsera', 'c.numeric_code'],
    )
      .limit(50)
      .getMany();
    correspondence.forEach((r) =>
      resultados.push({
        modulo: 'CORRESPONDENCIA',
        titulo: `[${r.originDept || 'GENERAL'} → ${r.destinationDept || 'DESTINO'}] ${r.subject || r.detail || 'Sin asunto'}`,
        codigo: r.documentCode || (r.numericCode ? `#${r.numericCode}` : r.id),
        fecha: r.documentDate,
        id: r.id,
        voxelsera: r.voxelsera,
      }),
    );

    const minutes = await this.applyWords(
      this.minutesRepo.createQueryBuilder('m'),
      words,
      ['m.unique_code', 'm.minute_type', 'm.post_name', 'm.observations', 'm.voxelsera', 'm.numeric_code'],
    )
      .limit(50)
      .getMany();
    minutes.forEach((r) =>
      resultados.push({
        modulo: 'MINUTAS',
        titulo: `${r.minuteType || 'Minuta'} - ${r.postName || 'Puesto'}`,
        codigo: r.uniqueCode || (r.numericCode ? `#${r.numericCode}` : r.id),
        fecha: r.startDate,
        id: r.id,
        voxelsera: r.voxelsera,
      }),
    );

    const retired = await this.applyWords(
      this.retiredRepo.createQueryBuilder('p'),
      words,
      ['p.full_name', 'p.id_number', 'p.retirement_reason', 'p.observations', 'p.voxelsera', 'p.numeric_code'],
    )
      .limit(50)
      .getMany();
    retired.forEach((r) =>
      resultados.push({
        modulo: 'ASOCIADOS RETIRADOS',
        titulo: `${r.fullName} (Cédula: ${r.idNumber || 'N/A'})`,
        codigo: r.numericCode ? `Carpeta #${r.numericCode}` : `CC: ${r.idNumber}`,
        fecha: r.retirementDate,
        id: r.id,
        voxelsera: r.voxelsera,
      }),
    );

    const loans = await this.applyWords(
      this.loansRepo.createQueryBuilder('l'),
      words,
      ['l.requester', 'l.department', 'l.document', 'l.document_code', 'l.status'],
    )
      .limit(50)
      .getMany();
    loans.forEach((r) =>
      resultados.push({
        modulo: 'PRESTAMOS',
        titulo: `[${r.status || 'PRESTADO'}] ${r.requester} (${r.department || 'N/A'})`,
        codigo: r.documentCode || r.id,
        fecha: r.loanDate,
        id: r.id,
        voxelsera: null,
      }),
    );

    return { resultados, total: resultados.length };
  }

  /** Hash determinista de un uuid a un compartimento 1..9 (fallback sin ubicación). */
  private fallbackSlot(id: string): number {
    let sum = 0;
    for (const ch of id) sum += ch.charCodeAt(0);
    return (sum % SLOTS_PER_SHELF) + 1;
  }

  private normalizeVoxel(raw: string | null, defaultShelf: string, id: string): string {
    if (!raw) return `VOXEL_${defaultShelf}${this.fallbackSlot(id)}`;
    if (raw.startsWith('VOXEL_')) return raw;
    const match = raw.match(/([A-Da-d])[-_ ]?([1-9])/);
    return match ? `VOXEL_${match[1].toUpperCase()}${match[2]}` : `VOXEL_${defaultShelf}1`;
  }

  async voxelseraMap() {
    const slots: Record<string, { slotId: string; code: string; count: number; items: unknown[] }> = {};
    for (const l of SHELVES) {
      for (let i = 1; i <= SLOTS_PER_SHELF; i++) {
        slots[`VOXEL_${l}${i}`] = { slotId: `VOXEL_${l}${i}`, code: `${l}${i}`, count: 0, items: [] };
      }
    }

    const push = (
      voxel: string,
      item: { id: string; modulo: string; codigo: string | null; titulo: string },
    ) => {
      const s = slots[voxel];
      if (!s) return;
      s.count++;
      if (s.items.length < 50) s.items.push(item);
    };

    // Secuencial a propósito (pooler Supabase session ~5).
    const minutes = await this.minutesRepo.find();
    const retired = await this.retiredRepo.find();
    const contracts = await this.contractsRepo.find();
    const correspondence = await this.correspondenceRepo.find();

    minutes.forEach((r) =>
      push(this.normalizeVoxel(r.voxelsera, 'A', r.id), {
        id: r.id, modulo: 'MINUTAS', codigo: r.uniqueCode, titulo: `${r.minuteType} - ${r.postName ?? ''}`,
      }),
    );
    retired.forEach((r) =>
      push(this.normalizeVoxel(r.voxelsera, 'B', r.id), {
        id: r.id, modulo: 'ASOCIADOS RETIRADOS', codigo: `CC: ${r.idNumber}`, titulo: `${r.fullName} (${r.retirementReason ?? 'Retirado'})`,
      }),
    );
    contracts.forEach((r) =>
      push(this.normalizeVoxel(r.voxelsera, 'C', r.id), {
        id: r.id, modulo: 'CONTRATOS', codigo: r.contractNumber, titulo: `${r.contractType ?? ''} (${r.partyA ?? ''})`,
      }),
    );
    correspondence.forEach((r) =>
      push(this.normalizeVoxel(r.voxelsera, 'D', r.id), {
        id: r.id, modulo: 'CORRESPONDENCIA', codigo: r.documentCode, titulo: `[${r.originDept}] ${r.subject ?? ''}`,
      }),
    );

    return { slots };
  }

  async analytics() {
    // Secuencial a propósito (pooler Supabase session ~5).
    const correspondencia = await this.correspondenceRepo.count();
    const minutas = await this.minutesRepo.count();
    const contratos = await this.contractsRepo.count();
    const prestamosActivos = await this.loansRepo.count({
      where: [{ status: 'ACTIVO' }, { status: 'VENCIDO' }],
    });
    const prestamosDevueltos = await this.loansRepo.count({ where: { status: 'DEVUELTO' } });
    const asociados = await this.retiredRepo.count();
    const minBreakdown = await this.minutesRepo
      .createQueryBuilder('m')
      .select('m.minute_type', 'tipo')
      .addSelect('COUNT(*)', 'total')
      .groupBy('m.minute_type')
      .getRawMany<{ tipo: string; total: string }>();

    const minutasBreakdown: Record<string, number> = { SERVICIO: 0, VISITANTES: 0, CORRESPONDENCIA: 0 };
    minBreakdown.forEach((r) => {
      if (r.tipo) minutasBreakdown[r.tipo.toUpperCase()] = parseInt(r.total, 10);
    });

    return { correspondencia, minutas, contratos, prestamosActivos, prestamosDevueltos, asociadosRetirados: asociados, minutasBreakdown };
  }

  async notifications() {
    const alertas: Array<Record<string, unknown>> = [];

    await this.loansRepo
      .createQueryBuilder()
      .update(Loan)
      .set({ status: 'VENCIDO' })
      .where('status = :a AND return_date < CURRENT_DATE', { a: 'ACTIVO' })
      .execute();

    const vencidos = await this.loansRepo
      .createQueryBuilder('l')
      .where("l.status = 'VENCIDO'")
      .orWhere("l.status = 'ACTIVO' AND l.return_date < CURRENT_DATE")
      .orderBy('l.return_date', 'ASC')
      .getMany();
    vencidos.forEach((p) =>
      alertas.push({
        tipo: 'PRESTAMO_VENCIDO', nivel: 'critico', modulo: 'prestamos', idRegistro: p.id,
        titulo: `Préstamo Vencido`,
        mensaje: `"${p.document || 'Sin título'}" prestado a ${p.requester} venció el ${String(p.returnDate).substring(0, 10)}.`,
      }),
    );

    const porVencer = await this.loansRepo
      .createQueryBuilder('l')
      .where("l.status = 'ACTIVO' AND l.return_date >= CURRENT_DATE AND l.return_date <= CURRENT_DATE + INTERVAL '3 days'")
      .getMany();
    porVencer.forEach((p) =>
      alertas.push({
        tipo: 'PRESTAMO_POR_VENCER', nivel: 'advertencia', modulo: 'prestamos', idRegistro: p.id,
        titulo: `Préstamo Próximo a Vencer`,
        mensaje: `"${p.document || 'Sin título'}" a ${p.requester} vence el ${String(p.returnDate).substring(0, 10)}.`,
      }),
    );

    const contratos = await this.contractsRepo
      .createQueryBuilder('c')
      .where("c.status = 'VIGENTE' AND c.end_date >= CURRENT_DATE AND c.end_date <= CURRENT_DATE + INTERVAL '30 days'")
      .getMany();
    contratos.forEach((c) =>
      alertas.push({
        tipo: 'CONTRATO_POR_VENCER', nivel: 'advertencia', modulo: 'contratos', idRegistro: c.id,
        titulo: `Contrato por Vencer (${c.contractNumber || c.id})`,
        mensaje: `Contrato ${c.partyA || ''} / ${c.partyB || ''} vence el ${String(c.endDate).substring(0, 10)}.`,
      }),
    );

    return { totalAlertas: alertas.length, alertas };
  }
}
