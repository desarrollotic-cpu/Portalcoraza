import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  MinutaContratistaDto,
  MinutaCorrespondenciaDto,
  MinutaDomiciliarioDto,
  MinutaEntregaDto,
  MinutaIncidenteDto,
  MinutaServicioDto,
  MinutaVisitanteDto,
} from './dto/minuta.dto';
import {
  MinutaContratista,
  MinutaCorrespondencia,
  MinutaDomiciliario,
  MinutaEntregaPuesto,
  MinutaIncidente,
  MinutaServicio,
  MinutaVisitante,
} from './entities/minuta.entities';

@Injectable()
export class MinutaService {
  constructor(
    @InjectRepository(MinutaVisitante)
    private readonly visitantes: Repository<MinutaVisitante>,
    @InjectRepository(MinutaCorrespondencia)
    private readonly correspondencia: Repository<MinutaCorrespondencia>,
    @InjectRepository(MinutaContratista)
    private readonly contratistas: Repository<MinutaContratista>,
    @InjectRepository(MinutaDomiciliario)
    private readonly domiciliarios: Repository<MinutaDomiciliario>,
    @InjectRepository(MinutaIncidente)
    private readonly incidentes: Repository<MinutaIncidente>,
    @InjectRepository(MinutaServicio)
    private readonly servicio: Repository<MinutaServicio>,
    @InjectRepository(MinutaEntregaPuesto)
    private readonly entregas: Repository<MinutaEntregaPuesto>,
  ) {}

  private nowBogota(): Date {
    return new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' }),
    );
  }

  private fmtDate(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  private fmtTime(d: Date): string {
    return d.toTimeString().slice(0, 8);
  }

  private fmtHm(d: Date): string {
    return d.toTimeString().slice(0, 5);
  }

  private newId(prefix: string): string {
    return `${prefix}-${String(Date.now()).slice(-8)}`;
  }

  private userName(user: JwtPayload): string {
    return (user.email || user.sub || 'portal').trim().toLowerCase();
  }

  private prioridad(gravedad: string): number {
    switch (gravedad) {
      case 'CRITICA':
        return 1;
      case 'ALTA':
        return 2;
      case 'MEDIA':
        return 3;
      default:
        return 4;
    }
  }

  private todayRange(): { start: Date; end: Date } {
    const now = this.nowBogota();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  async dashboard(user: JwtPayload) {
    const { start, end } = this.todayRange();
    const whereToday = { fechaRegistro: Between(start, end) };
    const [vis, inc, corrPend, activosVis, activosCont, activosDom] =
      await Promise.all([
        this.visitantes.count({ where: whereToday }),
        this.incidentes.count({ where: whereToday }),
        this.correspondencia.count({ where: { estado: 'PENDIENTE' } }),
        this.visitantes.count({ where: { estado: 'ACTIVO' } }),
        this.contratistas.count({ where: { estado: 'ACTIVO' } }),
        this.domiciliarios.count({ where: { estado: 'ENTREGANDO' } }),
      ]);

    const V = vis;
    const I = inc;
    let eficiencia = 100;
    if (V > 0) {
      const ip = (I / Math.max(V, 1)) * 100;
      eficiencia = Math.max(70, Math.min(100, Math.round(100 - ip * 0.5)));
    }

    const totalHoy =
      vis +
      (await this.correspondencia.count({ where: whereToday })) +
      (await this.contratistas.count({ where: whereToday })) +
      (await this.domiciliarios.count({ where: whereToday })) +
      inc +
      (await this.servicio.count({ where: whereToday })) +
      (await this.entregas.count({ where: whereToday }));

    return {
      success: true,
      usuario: this.userName(user),
      stats: {
        registrosHoy: totalHoy,
        visitantesHoy: vis,
        incidentesHoy: inc,
        eficiencia,
        correspondenciaPendiente: corrPend,
        activosEnSitio: activosVis + activosCont + activosDom,
      },
    };
  }

  async historial(
    user: JwtPayload,
    limite = 20,
    tipo?: string,
    todos = false,
  ) {
    const lim = Math.min(Math.max(limite, 1), 100);
    const usuario = this.userName(user);
    const chunks: Array<{
      tipo: string;
      fecha: Date;
      id: string;
      estado?: string;
      detalles: Record<string, unknown>;
    }> = [];

    const push = (
      tipoName: string,
      rows: Array<{ id: string; fechaRegistro: Date; estado?: string } & object>,
    ) => {
      for (const r of rows) {
        chunks.push({
          tipo: tipoName,
          fecha: r.fechaRegistro,
          id: r.id,
          estado: (r as { estado?: string }).estado,
          detalles: r as unknown as Record<string, unknown>,
        });
      }
    };

    const want = (t: string) => !tipo || tipo === 'TODOS' || tipo === t;
    const byUser = <T extends { usuario: string }>(
      extra?: FindOptionsWhere<T>,
    ): FindOptionsWhere<T> | undefined =>
      (todos
        ? extra
        : ({ ...(extra || {}), usuario } as FindOptionsWhere<T>));

    if (want('VISITANTE')) {
      push(
        'VISITANTE',
        await this.visitantes.find({
          where: byUser(),
          order: { fechaRegistro: 'DESC' },
          take: lim,
        }),
      );
    }
    if (want('CORRESPONDENCIA')) {
      push(
        'CORRESPONDENCIA',
        await this.correspondencia.find({
          where: byUser(),
          order: { fechaRegistro: 'DESC' },
          take: lim,
        }),
      );
    }
    if (want('CONTRATISTA')) {
      push(
        'CONTRATISTA',
        await this.contratistas.find({
          where: byUser(),
          order: { fechaRegistro: 'DESC' },
          take: lim,
        }),
      );
    }
    if (want('DOMICILIARIO')) {
      push(
        'DOMICILIARIO',
        await this.domiciliarios.find({
          where: byUser(),
          order: { fechaRegistro: 'DESC' },
          take: lim,
        }),
      );
    }
    if (want('INCIDENTE')) {
      push(
        'INCIDENTE',
        await this.incidentes.find({
          where: byUser(),
          order: { fechaRegistro: 'DESC' },
          take: lim,
        }),
      );
    }
    if (want('SERVICIO')) {
      push(
        'SERVICIO',
        await this.servicio.find({
          where: byUser(),
          order: { fechaRegistro: 'DESC' },
          take: lim,
        }),
      );
    }
    if (want('ENTREGA')) {
      const rows = await this.entregas.find({
        order: { fechaRegistro: 'DESC' },
        take: lim * 2,
      });
      push(
        'ENTREGA',
        todos
          ? rows
          : rows.filter(
              (r) =>
                r.vigilanteSaliente
                  .toLowerCase()
                  .includes(usuario.toLowerCase()) ||
                r.vigilanteEntrante
                  .toLowerCase()
                  .includes(usuario.toLowerCase()),
            ),
      );
    }

    chunks.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
    return { success: true, historial: chunks.slice(0, lim) };
  }

  async crearVisitante(user: JwtPayload, dto: MinutaVisitanteDto) {
    const now = this.nowBogota();
    const row = await this.visitantes.save(
      this.visitantes.create({
        id: this.newId('VIS'),
        fechaRegistro: now,
        associateId: null,
        usuario: this.userName(user),
        nombreCompleto: dto.nombre.trim().toUpperCase(),
        cedula: dto.cedula?.replace(/\D/g, '') || null,
        aptoNo: dto.apto.trim(),
        acompana: (dto.acompana || 'No')
          .replace(/^si$/i, 'Si')
          .replace(/^no$/i, 'No'),
        vehiculoPlaca: dto.vehiculo
          ? dto.vehiculo.replace(/\s+/g, '').toUpperCase()
          : null,
        horaEntrada: dto.horaEntrada || this.fmtHm(now),
        observaciones: dto.observaciones || null,
        estado: 'ACTIVO',
        postId: dto.postId || null,
      }),
    );
    return { success: true, id: row.id, fecha: row.fechaRegistro };
  }

  async crearCorrespondencia(
    user: JwtPayload,
    dto: MinutaCorrespondenciaDto,
  ) {
    const now = this.nowBogota();
    const entregado = dto.estado === 'ENTREGADO';
    const row = await this.correspondencia.save(
      this.correspondencia.create({
        id: this.newId('CORR'),
        fechaRegistro: now,
        associateId: null,
        usuario: this.userName(user),
        clase: dto.clase,
        aptoNo: dto.apto.trim(),
        destinatario: (dto.destinatario || 'Residente').trim(),
        remitente: dto.remitente || null,
        observaciones: dto.observaciones || null,
        estado: entregado ? 'ENTREGADO' : 'PENDIENTE',
        vigilanteEntrega: entregado ? this.userName(user) : null,
        fechaEntrega: entregado ? now : null,
        recibidoPor: entregado ? dto.recibidoPor || 'Residente' : null,
        postId: dto.postId || null,
      }),
    );
    return { success: true, id: row.id };
  }

  async entregarCorrespondencia(
    user: JwtPayload,
    id: string,
    recibidoPor: string,
  ) {
    const row = await this.correspondencia.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Correspondencia no encontrada');
    if (row.estado === 'ENTREGADO') {
      throw new BadRequestException('Ya estaba entregada');
    }
    row.estado = 'ENTREGADO';
    row.recibidoPor = recibidoPor.trim();
    row.vigilanteEntrega = this.userName(user);
    row.fechaEntrega = this.nowBogota();
    await this.correspondencia.save(row);
    return { success: true, id: row.id, message: 'Correspondencia entregada' };
  }

  async crearContratista(user: JwtPayload, dto: MinutaContratistaDto) {
    const cedula = dto.cedula.replace(/\D/g, '');
    if (cedula.length < 6) {
      throw new BadRequestException('Cédula numérica mínimo 6 dígitos');
    }
    const now = this.nowBogota();
    const row = await this.contratistas.save(
      this.contratistas.create({
        id: this.newId('CONT'),
        fechaRegistro: now,
        associateId: null,
        usuario: this.userName(user),
        nombreCompleto: dto.nombre.trim().toUpperCase(),
        cedula,
        empresa: dto.empresa.trim(),
        areaTrabajo: dto.areaTrabajo || null,
        horaIngreso: dto.horaIngreso || this.fmtHm(now),
        equipos: dto.equipos || null,
        autorizadoPor: dto.autorizadoPor.trim(),
        observaciones: dto.observaciones || null,
        estado: 'ACTIVO',
        postId: dto.postId || null,
      }),
    );
    return { success: true, id: row.id };
  }

  async crearDomiciliario(user: JwtPayload, dto: MinutaDomiciliarioDto) {
    const now = this.nowBogota();
    const row = await this.domiciliarios.save(
      this.domiciliarios.create({
        id: this.newId('DOM'),
        fechaRegistro: now,
        associateId: null,
        usuario: this.userName(user),
        empresa: dto.empresa,
        tipoPedido: dto.tipoPedido,
        aptoNo: dto.apto.trim(),
        nombreDomiciliario: dto.nombreDomiciliario || null,
        placaMoto: dto.placaMoto
          ? dto.placaMoto.replace(/\s+/g, '').toUpperCase()
          : null,
        horaLlegada: dto.horaLlegada || this.fmtHm(now),
        codigoPedido: dto.codigoPedido || null,
        observaciones: dto.observaciones || null,
        estado: 'ENTREGANDO',
        postId: dto.postId || null,
      }),
    );
    return { success: true, id: row.id };
  }

  async crearIncidente(user: JwtPayload, dto: MinutaIncidenteDto) {
    const now = this.nowBogota();
    const row = await this.incidentes.save(
      this.incidentes.create({
        id: this.newId('INC'),
        fechaRegistro: now,
        associateId: null,
        usuario: this.userName(user),
        tipo: dto.tipo,
        gravedad: dto.gravedad,
        ubicacion: dto.ubicacion.trim(),
        descripcion: dto.descripcion.trim(),
        personasInvolucradas: dto.personasInvolucradas || null,
        accionesTomadas:
          dto.accionesTomadas?.trim() || 'Reportado a supervisión',
        reportadoA: dto.reportadoA?.trim() || 'Supervisor',
        estado: 'ABIERTO',
        prioridad: this.prioridad(dto.gravedad),
        postId: dto.postId || null,
      }),
    );
    return { success: true, id: row.id, prioridad: row.prioridad };
  }

  async crearServicio(user: JwtPayload, dto: MinutaServicioDto) {
    const now = this.nowBogota();
    const row = await this.servicio.save(
      this.servicio.create({
        id: this.newId('SERV'),
        fecha: this.fmtDate(now),
        hora: this.fmtTime(now),
        fechaRegistro: now,
        associateId: null,
        usuario: this.userName(user),
        anotaciones: dto.anotaciones.trim(),
        novedades: dto.novedades || null,
        postId: dto.postId || null,
      }),
    );
    return { success: true, id: row.id };
  }

  async crearEntrega(user: JwtPayload, dto: MinutaEntregaDto) {
    void user;
    const now = this.nowBogota();
    const row = await this.entregas.save(
      this.entregas.create({
        id: this.newId('ENT'),
        fecha: this.fmtDate(now),
        hora: this.fmtHm(now),
        fechaRegistro: now,
        associateId: null,
        turnoSaliente: dto.turnoSaliente,
        turnoEntrante: dto.turnoEntrante,
        vigilanteSaliente: dto.vigilanteSaliente.trim().toUpperCase(),
        vigilanteEntrante: dto.vigilanteEntrante.trim().toUpperCase(),
        nombreDelPuesto: dto.nombreDelPuesto.trim(),
        novedades: dto.novedades || null,
        equiposEntregados: dto.equiposEntregados || 'Radio, Linterna',
        llavesEntregadas: dto.llavesEntregadas || 'Set completo',
        observaciones: dto.observaciones || null,
        estado: 'COMPLETADO',
        postId: dto.postId || null,
      }),
    );
    return { success: true, id: row.id };
  }

  async registrarSalida(
    id: string,
    tipo: 'VISITANTE' | 'CONTRATISTA' | 'DOMICILIARIO',
  ) {
    const now = this.nowBogota();
    if (tipo === 'VISITANTE') {
      const row = await this.visitantes.findOne({ where: { id } });
      if (!row) throw new NotFoundException('Visitante no encontrado');
      if (row.estado === 'COMPLETADO') {
        throw new BadRequestException('Salida ya registrada');
      }
      row.horaSalida = now;
      row.estado = 'COMPLETADO';
      await this.visitantes.save(row);
      return {
        success: true,
        id,
        salida: now.toISOString(),
        message: 'Salida registrada',
      };
    }
    if (tipo === 'CONTRATISTA') {
      const row = await this.contratistas.findOne({ where: { id } });
      if (!row) throw new NotFoundException('Contratista no encontrado');
      if (row.estado === 'COMPLETADO') {
        throw new BadRequestException('Salida ya registrada');
      }
      row.horaSalida = now;
      row.estado = 'COMPLETADO';
      await this.contratistas.save(row);
      return {
        success: true,
        id,
        salida: now.toISOString(),
        message: 'Salida registrada',
      };
    }
    const row = await this.domiciliarios.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Domiciliario no encontrado');
    if (row.estado === 'COMPLETADO') {
      throw new BadRequestException('Salida ya registrada');
    }
    row.horaSalida = now;
    row.estado = 'COMPLETADO';
    await this.domiciliarios.save(row);
    return {
      success: true,
      id,
      salida: now.toISOString(),
      message: 'Salida registrada',
    };
  }

  async diagnostico() {
    const counts = {
      visitantes: await this.visitantes.count(),
      correspondencia: await this.correspondencia.count(),
      contratistas: await this.contratistas.count(),
      domiciliarios: await this.domiciliarios.count(),
      incidentes: await this.incidentes.count(),
      servicio: await this.servicio.count(),
      entregaPuesto: await this.entregas.count(),
    };
    return {
      success: true,
      version: 'Minuta Virtual 8.0 Pro MVP',
      timezone: 'America/Bogota',
      counts,
    };
  }
}
