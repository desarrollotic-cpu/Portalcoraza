import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateSstClientDto,
  CreateSstInspectionDto,
  CreateSstWorkplaceDto,
  SaveSstInspectionDto,
  UpsertSstResponseDto,
} from './dto/sst.dto';
import { SstChecklistItem } from './entities/sst-checklist-item.entity';
import { SstClient } from './entities/sst-client.entity';
import { SstEvidence } from './entities/sst-evidence.entity';
import {
  SstInspection,
  SstInspectionStatus,
  SstInspectionType,
} from './entities/sst-inspection.entity';
import {
  SstPlanStatus,
  SstResponse,
  SstValoracion,
} from './entities/sst-response.entity';
import { SstWorkplace, SstWorkplaceType } from './entities/sst-workplace.entity';
import { computeCompliance } from './sst-compliance';
import { buildAsciiReport, buildMarkdownReport } from './sst-reports';

@Injectable()
export class SstService {
  constructor(
    @InjectRepository(SstClient) private readonly clients: Repository<SstClient>,
    @InjectRepository(SstWorkplace)
    private readonly workplaces: Repository<SstWorkplace>,
    @InjectRepository(SstChecklistItem)
    private readonly items: Repository<SstChecklistItem>,
    @InjectRepository(SstInspection)
    private readonly inspections: Repository<SstInspection>,
    @InjectRepository(SstResponse)
    private readonly responses: Repository<SstResponse>,
    @InjectRepository(SstEvidence)
    private readonly evidences: Repository<SstEvidence>,
  ) {}

  listClients() {
    return this.clients.find({ order: { nombre: 'ASC' } });
  }

  createClient(dto: CreateSstClientDto) {
    return this.clients.save(
      this.clients.create({
        nombre: dto.nombre.trim(),
        nit: dto.nit?.trim() || null,
        contacto: dto.contacto?.trim() || null,
        telefono: dto.telefono?.trim() || null,
      }),
    );
  }

  listWorkplaces() {
    return this.workplaces.find({
      relations: { client: true },
      order: { nombre: 'ASC' },
      where: { activo: true },
    });
  }

  async createWorkplace(dto: CreateSstWorkplaceDto) {
    const client = await this.clients.findOne({ where: { id: dto.clientId } });
    if (!client) throw new NotFoundException('Cliente SST no encontrado');
    return this.workplaces.save(
      this.workplaces.create({
        clientId: dto.clientId,
        postId: dto.postId ?? null,
        nombre: dto.nombre.trim(),
        direccion: dto.direccion?.trim() || null,
        ciudad: dto.ciudad?.trim() || 'Medellín',
        tipoPuesto: dto.tipoPuesto ?? SstWorkplaceType.OTRO,
        activo: dto.activo ?? true,
      }),
    );
  }

  listChecklist() {
    return this.items.find({
      where: { activo: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async overview() {
    const [inspections, critical, openPlans] = await Promise.all([
      this.inspections.count(),
      this.responses
        .createQueryBuilder('r')
        .where('r.reincidencia_count >= 3')
        .andWhere('r.valoracion = :v', { v: SstValoracion.RIESGOSO })
        .getCount(),
      this.responses
        .createQueryBuilder('r')
        .where('r.estado_plan_accion IN (:...st)', {
          st: [SstPlanStatus.ABIERTO, SstPlanStatus.EN_PROCESO, SstPlanStatus.REINCIDENTE],
        })
        .getCount(),
    ]);
    const recent = await this.inspections.find({
      relations: { workplace: { client: true } },
      order: { createdAt: 'DESC' },
      take: 8,
    });
    return { inspections, criticalAlerts: critical, openPlans, recent };
  }

  async listActionPlans(filter?: string) {
    const qb = this.responses
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.item', 'item')
      .leftJoinAndSelect('r.inspection', 'insp')
      .leftJoinAndSelect('insp.workplace', 'wp')
      .leftJoinAndSelect('wp.client', 'client')
      .where('r.valoracion = :v', { v: SstValoracion.RIESGOSO })
      .orderBy('r.fecha_compromiso', 'ASC', 'NULLS LAST');

    const today = new Date().toISOString().slice(0, 10);
    if (filter === 'abiertos') {
      qb.andWhere('r.estado_plan_accion IN (:...st)', {
        st: [SstPlanStatus.ABIERTO, SstPlanStatus.EN_PROCESO],
      });
    } else if (filter === 'reincidentes') {
      qb.andWhere('r.reincidencia_count >= 3');
    } else if (filter === 'vencidos') {
      qb.andWhere('r.fecha_compromiso < :today', { today }).andWhere(
        'r.estado_plan_accion != :cerrado',
        { cerrado: SstPlanStatus.CERRADO },
      );
    } else if (filter === 'cerrados') {
      qb.andWhere('r.estado_plan_accion = :cerrado', { cerrado: SstPlanStatus.CERRADO });
    }
    return qb.getMany();
  }

  async createInspection(dto: CreateSstInspectionDto, userId?: string) {
    const wp = await this.workplaces.findOne({ where: { id: dto.workplaceId } });
    if (!wp) throw new NotFoundException('Puesto SST no encontrado');

    const items = await this.listChecklist();
    if (!items.length) {
      throw new BadRequestException('Catálogo SST vacío: aplica migración 029_sst_ipt.sql');
    }

    let anterior: SstInspection | null = null;
    if (dto.tipo === SstInspectionType.SEGUIMIENTO) {
      anterior = await this.inspections.findOne({
        where: [
          { workplaceId: dto.workplaceId, estado: SstInspectionStatus.CERRADA },
          { workplaceId: dto.workplaceId, estado: SstInspectionStatus.COMPLETADA },
        ],
        order: { fecha: 'DESC', createdAt: 'DESC' },
        relations: { respuestas: true },
      });
      if (!anterior) {
        throw new BadRequestException(
          'No hay inspección COMPLETADA/CERRADA previa para este puesto',
        );
      }
    }

    const insp = await this.inspections.save(
      this.inspections.create({
        workplaceId: dto.workplaceId,
        tipo: dto.tipo,
        inspeccionAnteriorId: anterior?.id ?? null,
        fecha: dto.fecha ?? new Date().toISOString().slice(0, 10),
        responsableNombre: dto.responsableNombre.trim(),
        responsableCargo: dto.responsableCargo?.trim() || 'Inspector SST',
        inspectorUserId: userId ?? null,
        estado: SstInspectionStatus.BORRADOR,
        observacionesGenerales: dto.observacionesGenerales?.trim() || null,
      }),
    );

    const prevByItem = new Map(
      (anterior?.respuestas ?? []).map((r) => [r.itemId, r] as const),
    );

    for (const item of items) {
      const prev = prevByItem.get(item.id);
      await this.responses.save(
        this.responses.create({
          inspectionId: insp.id,
          itemId: item.id,
          valoracion: null,
          valoracionAnterior: prev?.valoracion ?? null,
          hallazgo: prev?.valoracion === SstValoracion.RIESGOSO ? prev.hallazgo : null,
          planAccionPropuesto:
            prev?.valoracion === SstValoracion.RIESGOSO ? prev.planAccionPropuesto : null,
          responsablePlanAccion: prev?.responsablePlanAccion ?? null,
          fechaCompromiso: prev?.fechaCompromiso ?? null,
          estadoPlanAccion:
            prev?.valoracion === SstValoracion.RIESGOSO
              ? prev.estadoPlanAccion ?? SstPlanStatus.ABIERTO
              : null,
          reincidenciaCount: prev?.reincidenciaCount ?? 0,
        }),
      );
    }

    return this.getInspection(insp.id);
  }

  async getInspection(id: string) {
    const insp = await this.inspections.findOne({
      where: { id },
      relations: {
        workplace: { client: true },
        respuestas: { item: true, evidencias: true },
      },
      order: { respuestas: { item: { sortOrder: 'ASC' } } } as never,
    });
    if (!insp) throw new NotFoundException('Inspección no encontrada');
    insp.respuestas = (insp.respuestas ?? []).sort(
      (a, b) => (a.item?.sortOrder ?? 0) - (b.item?.sortOrder ?? 0),
    );
    return insp;
  }

  async listInspections(workplaceId?: string) {
    return this.inspections.find({
      where: workplaceId ? { workplaceId } : {},
      relations: { workplace: { client: true } },
      order: { fecha: 'DESC', createdAt: 'DESC' },
      take: 100,
    });
  }

  async saveInspection(id: string, dto: SaveSstInspectionDto) {
    const insp = await this.getInspection(id);
    if (insp.estado === SstInspectionStatus.CERRADA) {
      throw new BadRequestException('La inspección está cerrada');
    }

    if (dto.observacionesGenerales !== undefined) {
      insp.observacionesGenerales = dto.observacionesGenerales?.trim() || null;
    }

    const byItem = new Map(insp.respuestas.map((r) => [r.itemId, r]));

    for (const row of dto.respuestas) {
      await this.applyResponse(insp, byItem.get(row.itemId), row);
    }

    const fresh = await this.getInspection(id);
    const stats = computeCompliance(fresh.respuestas.map((r) => r.valoracion));
    fresh.cumplimientoGlobal = stats.percent != null ? String(stats.percent) : null;
    fresh.nivelRiesgo = stats.nivel;

    if (dto.completar) {
      this.assertCompletable(fresh);
      fresh.estado = SstInspectionStatus.COMPLETADA;
    }

    await this.inspections.save(fresh);
    return this.getInspection(id);
  }

  async closeInspection(id: string) {
    const insp = await this.getInspection(id);
    if (insp.estado === SstInspectionStatus.BORRADOR) {
      this.assertCompletable(insp);
      insp.estado = SstInspectionStatus.COMPLETADA;
    }
    insp.estado = SstInspectionStatus.CERRADA;
    const stats = computeCompliance(insp.respuestas.map((r) => r.valoracion));
    insp.cumplimientoGlobal = stats.percent != null ? String(stats.percent) : null;
    insp.nivelRiesgo = stats.nivel;
    await this.inspections.save(insp);
    return this.getInspection(id);
  }

  async report(id: string) {
    const insp = await this.getInspection(id);
    return {
      markdown: buildMarkdownReport(insp),
      ascii: buildAsciiReport(insp),
      cumplimientoGlobal: insp.cumplimientoGlobal,
      nivelRiesgo: insp.nivelRiesgo,
    };
  }

  private assertCompletable(insp: SstInspection) {
    const missing = (insp.respuestas ?? []).filter((r) => !r.valoracion);
    if (missing.length) {
      throw new BadRequestException(
        `Hay ${missing.length} ítems sin calificar; no se puede completar`,
      );
    }
    for (const r of insp.respuestas) {
      if (r.valoracion === SstValoracion.RIESGOSO) {
        if (!r.hallazgo?.trim() || !r.planAccionPropuesto?.trim()) {
          throw new BadRequestException(
            `Ítem ${r.item?.codigo ?? r.itemId}: hallazgo y plan de acción son obligatorios`,
          );
        }
      }
    }
  }

  private async applyResponse(
    insp: SstInspection,
    existing: SstResponse | undefined,
    row: UpsertSstResponseDto,
  ) {
    if (!existing) throw new BadRequestException(`Ítem no pertenece a la inspección`);

    if (row.valoracion === SstValoracion.RIESGOSO) {
      if (!row.hallazgo?.trim() || !row.planAccionPropuesto?.trim()) {
        throw new BadRequestException(
          'Hallazgo y plan de acción son obligatorios cuando la valoración es RIESGOSO',
        );
      }
    }

    existing.valoracion = row.valoracion;

    if (insp.tipo === SstInspectionType.SEGUIMIENTO && existing.valoracionAnterior) {
      if (
        existing.valoracionAnterior === SstValoracion.RIESGOSO &&
        row.valoracion === SstValoracion.SEGURO
      ) {
        existing.estadoPlanAccion = SstPlanStatus.CERRADO;
        existing.fechaCierre = new Date().toISOString().slice(0, 10);
      } else if (
        existing.valoracionAnterior === SstValoracion.RIESGOSO &&
        row.valoracion === SstValoracion.RIESGOSO
      ) {
        existing.estadoPlanAccion = SstPlanStatus.REINCIDENTE;
        existing.reincidenciaCount = (existing.reincidenciaCount || 0) + 1;
      }
    } else if (row.valoracion === SstValoracion.RIESGOSO) {
      existing.estadoPlanAccion = row.estadoPlanAccion ?? SstPlanStatus.ABIERTO;
      if (!existing.reincidenciaCount) existing.reincidenciaCount = 1;
    } else {
      existing.estadoPlanAccion = null;
    }

    existing.hallazgo = row.hallazgo?.trim() || null;
    existing.planAccionPropuesto = row.planAccionPropuesto?.trim() || null;
    existing.responsablePlanAccion = row.responsablePlanAccion?.trim() || null;
    existing.fechaCompromiso = row.fechaCompromiso ?? null;

    await this.responses.save(existing);

    if (row.evidenciasUrls?.length) {
      await this.evidences.delete({ responseId: existing.id });
      for (const url of row.evidenciasUrls) {
        if (!url?.trim()) continue;
        await this.evidences.save(
          this.evidences.create({
            responseId: existing.id,
            urlArchivo: url.trim(),
            descripcion: null,
          }),
        );
      }
    }
  }
}
