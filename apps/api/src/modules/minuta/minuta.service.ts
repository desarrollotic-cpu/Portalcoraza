import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import PDFDocument = require('pdfkit');
import { Between, FindOptionsWhere, In, Repository } from 'typeorm';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Post } from '../posts/entities/post.entity';
import { UserPost } from '../users/entities/user-post.entity';
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

export type MinutaPostScope =
  | { restricted: false }
  | { restricted: true; postIds: string[] };

export type OperacionesMinutaRow = {
  tipo: string;
  id: string;
  fecha: string;
  estado: string;
  resumen: string;
  registradoPor: string;
  /** Campos del registro para vista detalle (UI ojo). */
  detalles: Record<string, unknown>;
};

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
    @InjectRepository(UserPost)
    private readonly userPosts: Repository<UserPost>,
    @InjectRepository(Post)
    private readonly posts: Repository<Post>,
  ) {}

  /** PUESTO solo ve/crea en posts de user_posts; resto sin restricción. */
  async resolvePostScope(user: JwtPayload): Promise<MinutaPostScope> {
    if (user.roleCode !== 'PUESTO') return { restricted: false };
    const rows = await this.userPosts.find({ where: { userId: user.sub } });
    const postIds = rows.map((r) => r.postId);
    if (postIds.length === 0) {
      throw new ForbiddenException('Cuenta de puesto sin puesto asignado');
    }
    return { restricted: true, postIds };
  }

  async resolveCreatePostId(
    user: JwtPayload,
    requested?: string | null,
  ): Promise<string | null> {
    const scope = await this.resolvePostScope(user);
    if (!scope.restricted) return requested || null;
    if (requested && !scope.postIds.includes(requested)) {
      throw new ForbiddenException('No puede registrar minuta en otro puesto');
    }
    return requested && scope.postIds.includes(requested)
      ? requested
      : scope.postIds[0];
  }

  private async assertPostAccess(
    user: JwtPayload,
    postId: string | null | undefined,
  ): Promise<void> {
    const scope = await this.resolvePostScope(user);
    if (!scope.restricted) return;
    if (!postId || !scope.postIds.includes(postId)) {
      throw new ForbiddenException('Registro fuera del puesto asignado');
    }
  }

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
    const scope = await this.resolvePostScope(user);
    const postFilter = scope.restricted
      ? { postId: In(scope.postIds) }
      : {};
    const whereToday = { fechaRegistro: Between(start, end), ...postFilter };
    const [vis, inc, corrPend, activosVis, activosCont, activosDom] =
      await Promise.all([
        this.visitantes.count({ where: whereToday }),
        this.incidentes.count({ where: whereToday }),
        this.correspondencia.count({
          where: { estado: 'PENDIENTE', ...postFilter },
        }),
        this.visitantes.count({ where: { estado: 'ACTIVO', ...postFilter } }),
        this.contratistas.count({ where: { estado: 'ACTIVO', ...postFilter } }),
        this.domiciliarios.count({
          where: { estado: 'ENTREGANDO', ...postFilter },
        }),
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
      postIds: scope.restricted ? scope.postIds : null,
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
    const scope = await this.resolvePostScope(user);
    // Cuenta de puesto: historial del puesto (no solo lo que escribió el email).
    const forcePost = scope.restricted;
    const allowTodos = todos && !forcePost;

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
    const byScope = <T extends { usuario: string; postId?: string | null }>(
      extra?: FindOptionsWhere<T>,
    ): FindOptionsWhere<T> | undefined => {
      if (forcePost) {
        return {
          ...(extra || {}),
          postId: In(scope.postIds),
        } as FindOptionsWhere<T>;
      }
      return (allowTodos
        ? extra
        : ({ ...(extra || {}), usuario } as FindOptionsWhere<T>));
    };

    if (want('VISITANTE')) {
      push(
        'VISITANTE',
        await this.visitantes.find({
          where: byScope(),
          order: { fechaRegistro: 'DESC' },
          take: lim,
        }),
      );
    }
    if (want('CORRESPONDENCIA')) {
      push(
        'CORRESPONDENCIA',
        await this.correspondencia.find({
          where: byScope(),
          order: { fechaRegistro: 'DESC' },
          take: lim,
        }),
      );
    }
    if (want('CONTRATISTA')) {
      push(
        'CONTRATISTA',
        await this.contratistas.find({
          where: byScope(),
          order: { fechaRegistro: 'DESC' },
          take: lim,
        }),
      );
    }
    if (want('DOMICILIARIO')) {
      push(
        'DOMICILIARIO',
        await this.domiciliarios.find({
          where: byScope(),
          order: { fechaRegistro: 'DESC' },
          take: lim,
        }),
      );
    }
    if (want('INCIDENTE')) {
      push(
        'INCIDENTE',
        await this.incidentes.find({
          where: byScope(),
          order: { fechaRegistro: 'DESC' },
          take: lim,
        }),
      );
    }
    if (want('SERVICIO')) {
      push(
        'SERVICIO',
        await this.servicio.find({
          where: byScope(),
          order: { fechaRegistro: 'DESC' },
          take: lim,
        }),
      );
    }
    if (want('ENTREGA')) {
      const rows = await this.entregas.find({
        where: forcePost ? { postId: In(scope.postIds) } : undefined,
        order: { fechaRegistro: 'DESC' },
        take: lim * 2,
      });
      push(
        'ENTREGA',
        forcePost || allowTodos
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

  /** Rango [start, end) America/Bogota para YYYY-MM. */
  parseMonthBounds(month: string): { start: Date; end: Date; label: string } {
    if (!/^\d{4}-\d{2}$/.test(month || '')) {
      throw new BadRequestException('Mes inválido (use YYYY-MM)');
    }
    const [y, m] = month.split('-').map(Number);
    if (m < 1 || m > 12) {
      throw new BadRequestException('Mes inválido (use YYYY-MM)');
    }
    const start = new Date(`${month}-01T00:00:00-05:00`);
    const next =
      m === 12
        ? `${y + 1}-01`
        : `${y}-${String(m + 1).padStart(2, '0')}`;
    const end = new Date(`${next}-01T00:00:00-05:00`);
    return { start, end, label: month };
  }

  private async resolveOperacionesPost(
    user: JwtPayload,
    postId?: string,
  ): Promise<Post> {
    if (!postId?.trim()) {
      throw new BadRequestException('Debe indicar el puesto (postId)');
    }
    await this.assertPostAccess(user, postId);
    const post = await this.posts.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Puesto no encontrado');
    return post;
  }

  private normalizeRegistradoPor(value: string): string {
    const name = (value || '').trim().toUpperCase();
    if (name.length < 2) {
      throw new BadRequestException('Indique el vigilante que registra');
    }
    return name;
  }

  private resumenMinuta(
    tipo: string,
    row: Record<string, unknown>,
  ): string {
    const reg = row['registradoPor']
      ? `Registra: ${row['registradoPor']}`
      : null;
    let base: string;
    switch (tipo) {
      case 'VISITANTE':
        base = `${row['nombreCompleto'] || '—'} · Apto ${row['aptoNo'] || '—'}`;
        break;
      case 'CORRESPONDENCIA':
        base = `${row['clase'] || '—'} · Apto ${row['aptoNo'] || '—'} · ${row['destinatario'] || '—'}`;
        break;
      case 'CONTRATISTA':
        base = `${row['nombreCompleto'] || '—'} · ${row['empresa'] || '—'}`;
        break;
      case 'DOMICILIARIO':
        base = `${row['empresa'] || '—'} · Apto ${row['aptoNo'] || '—'} · ${row['tipoPedido'] || '—'}`;
        break;
      case 'INCIDENTE':
        base = `${row['tipo'] || '—'} · ${row['gravedad'] || '—'} · ${row['ubicacion'] || '—'}`;
        break;
      case 'SERVICIO':
        base = String(row['anotaciones'] || row['novedades'] || '—').slice(0, 120);
        break;
      case 'ENTREGA':
        base = `${row['turnoSaliente'] || '—'} → ${row['turnoEntrante'] || '—'} · ${row['vigilanteSaliente'] || '—'} / ${row['vigilanteEntrante'] || '—'}`;
        break;
      default:
        base = '—';
    }
    return reg ? `${reg} · ${base}` : base;
  }

  /** Campos legibles para el modal de detalle (sin metadatos internos). */
  private detallesPublicos(row: Record<string, unknown>): Record<string, unknown> {
    const omit = new Set([
      'usuario',
      'associateId',
      'postId',
      'createdAt',
      'updatedAt',
    ]);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (omit.has(k) || v === null || v === undefined || v === '') continue;
      if (typeof v === 'object' && !(v instanceof Date)) continue;
      out[k] = v instanceof Date ? v.toISOString() : v;
    }
    return out;
  }

  async operacionesHistorial(
    user: JwtPayload,
    postId: string | undefined,
    month: string | undefined,
  ): Promise<{
    success: true;
    post: { id: string; code: string; name: string };
    month: string;
    total: number;
    historial: OperacionesMinutaRow[];
  }> {
    if (!month?.trim()) {
      throw new BadRequestException('Debe indicar el mes (YYYY-MM)');
    }
    const post = await this.resolveOperacionesPost(user, postId);
    const { start, end, label } = this.parseMonthBounds(month.trim());
    const period = {
      postId: post.id,
      fechaRegistro: Between(start, new Date(end.getTime() - 1)),
    };

    const [
      visitantes,
      correspondencia,
      contratistas,
      domiciliarios,
      incidentes,
      servicio,
      entregas,
    ] = await Promise.all([
      this.visitantes.find({ where: period, order: { fechaRegistro: 'DESC' } }),
      this.correspondencia.find({
        where: period,
        order: { fechaRegistro: 'DESC' },
      }),
      this.contratistas.find({
        where: period,
        order: { fechaRegistro: 'DESC' },
      }),
      this.domiciliarios.find({
        where: period,
        order: { fechaRegistro: 'DESC' },
      }),
      this.incidentes.find({ where: period, order: { fechaRegistro: 'DESC' } }),
      this.servicio.find({ where: period, order: { fechaRegistro: 'DESC' } }),
      this.entregas.find({ where: period, order: { fechaRegistro: 'DESC' } }),
    ]);

    const historial: OperacionesMinutaRow[] = [];
    const push = (
      tipo: string,
      rows: Array<{ id: string; fechaRegistro: Date; estado?: string } & object>,
    ) => {
      for (const r of rows) {
        historial.push({
          tipo,
          id: r.id,
          fecha: r.fechaRegistro.toISOString(),
          estado: (r as { estado?: string }).estado || '—',
          resumen: this.resumenMinuta(
            tipo,
            r as unknown as Record<string, unknown>,
          ),
          registradoPor:
            (r as { registradoPor?: string | null }).registradoPor || '—',
          detalles: this.detallesPublicos(
            r as unknown as Record<string, unknown>,
          ),
        });
      }
    };

    push('VISITANTE', visitantes);
    push('CORRESPONDENCIA', correspondencia);
    push('CONTRATISTA', contratistas);
    push('DOMICILIARIO', domiciliarios);
    push('INCIDENTE', incidentes);
    push('SERVICIO', servicio);
    push('ENTREGA', entregas);
    historial.sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
    );

    return {
      success: true,
      post: { id: post.id, code: post.code, name: post.name },
      month: label,
      total: historial.length,
      historial,
    };
  }

  async buildOperacionesPdf(
    user: JwtPayload,
    postId: string | undefined,
    month: string | undefined,
  ): Promise<Buffer> {
    const data = await this.operacionesHistorial(user, postId, month);
    // Acta: más antigua primero, numerada 1…N
    const rows = [...data.historial].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );

    // bottom amplio: el pie vive ahí; sin esto pdfkit crea páginas al dibujar el footer
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 48, left: 48, right: 48, bottom: 100 },
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const contentWidth =
      doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const bottomLimit = () => doc.page.height - doc.page.margins.bottom - 4;

    const ensureSpace = (needed: number) => {
      if (doc.y + needed > bottomLimit()) doc.addPage();
    };

    // Encabezado
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor('#0f172a')
      .text('MINUTA DE PUESTO', { align: 'center', width: contentWidth });
    doc.moveDown(0.35);
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(data.post.name, { align: 'center', width: contentWidth });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#334155')
      .text(`Código: ${data.post.code} · Período: ${data.month}`, {
        align: 'center',
        width: contentWidth,
      });
    doc
      .fontSize(8)
      .text(
        `Generado: ${this.fmtDate(this.nowBogota())} ${this.fmtHm(this.nowBogota())} · Total anotaciones: ${rows.length}`,
        { align: 'center', width: contentWidth },
      );
    doc.moveDown(0.4);
    doc
      .strokeColor('#94a3b8')
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.width - doc.page.margins.right, doc.y)
      .stroke();
    doc.moveDown(0.6);

    if (!rows.length) {
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor('#0f172a')
        .text(
          'No hay registros de minuta para el puesto y mes seleccionados.',
          { width: contentWidth },
        );
    } else {
      let n = 0;
      for (const row of rows) {
        n += 1;
        ensureSpace(90);
        const when = new Date(row.fecha);
        doc
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor('#0f172a')
          .text(
            `${n}. ${row.tipo} · ${row.id}`,
            { width: contentWidth },
          );
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#334155')
          .text(
            `Fecha: ${this.fmtDate(when)} ${this.fmtHm(when)} · Estado: ${row.estado} · Registra: ${row.registradoPor}`,
            { width: contentWidth },
          );
        doc.moveDown(0.25);

        const details = { ...(row.detalles || {}) };
        delete details['id'];
        delete details['estado'];
        delete details['registradoPor'];
        delete details['fechaRegistro'];
        delete details['fecha'];
        delete details['hora'];

        const lines = this.pdfDetailLines(details);
        for (const line of lines) {
          ensureSpace(16);
          doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor('#0f172a')
            .text(line, {
              width: contentWidth,
              indent: 12,
            });
        }
        doc.moveDown(0.55);
        doc
          .strokeColor('#e2e8f0')
          .moveTo(doc.page.margins.left, doc.y)
          .lineTo(doc.page.width - doc.page.margins.right, doc.y)
          .stroke();
        doc.moveDown(0.55);
      }
    }

    // Pie en todas las páginas
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      this.drawMinutaPdfFooter(doc, i + 1, range.count);
    }

    doc.end();
    return finished;
  }

  private pdfDetailLines(details: Record<string, unknown>): string[] {
    const labels: Record<string, string> = {
      nombreCompleto: 'Nombre',
      cedula: 'Cédula',
      aptoNo: 'Apto / unidad',
      acompana: 'Acompaña',
      vehiculoPlaca: 'Placa',
      horaEntrada: 'Hora entrada',
      horaSalida: 'Hora salida',
      observaciones: 'Observaciones',
      clase: 'Clase',
      destinatario: 'Destinatario',
      remitente: 'Remitente',
      recibidoPor: 'Recibido por',
      horaEntrega: 'Hora entrega',
      empresa: 'Empresa',
      areaTrabajo: 'Área de trabajo',
      autorizadoPor: 'Autorizado por',
      tipoPedido: 'Tipo de pedido',
      nombreDomiciliario: 'Domiciliario',
      placaMoto: 'Placa moto',
      tipo: 'Tipo',
      gravedad: 'Gravedad',
      ubicacion: 'Ubicación',
      descripcion: 'Descripción',
      anotaciones: 'Anotaciones',
      novedades: 'Novedades',
      turnoSaliente: 'Turno saliente',
      turnoEntrante: 'Turno entrante',
      vigilanteSaliente: 'Vigilante saliente',
      vigilanteEntrante: 'Vigilante entrante',
      nombreDelPuesto: 'Nombre del puesto',
    };
    const preferred = Object.keys(labels);
    const keys = [
      ...preferred.filter((k) => details[k] !== undefined && details[k] !== null && details[k] !== ''),
      ...Object.keys(details).filter((k) => !preferred.includes(k)),
    ];
    const lines: string[] = [];
    for (const k of keys) {
      const v = details[k];
      if (v === null || v === undefined || v === '') continue;
      if (typeof v === 'object') continue;
      const label = labels[k] || k;
      lines.push(`${label}: ${String(v)}`);
    }
    return lines;
  }

  private drawMinutaPdfFooter(
    doc: InstanceType<typeof PDFDocument>,
    page: number,
    total: number,
  ): void {
    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;
    const savedBottom = doc.page.margins.bottom;
    // Critical: pie debajo del margen de contenido; sin esto text() abre página nueva
    doc.page.margins.bottom = 0;

    const y = doc.page.height - 72;

    doc
      .save()
      .strokeColor('#94a3b8')
      .moveTo(left, y - 8)
      .lineTo(right, y - 8)
      .stroke()
      .restore();

    doc
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#334155')
      .text(
        'Carrera 81 No. 49-24 · PBX 444 79 29 · Tel. 234 79 29 · Medellín - Antioquia',
        left,
        y,
        { width, align: 'center', lineBreak: false, height: 9 },
      );
    doc.text(
      'contacto@corazaseguridadcta.com · corazaseguridad@une.net.co · www.corazaseguridad.com',
      left,
      y + 10,
      { width, align: 'center', lineBreak: false, height: 9 },
    );
    doc
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text(
        'VIGILADO SuperVigilancia Resolución 6889 del 29 de septiembre de 2011',
        left,
        y + 20,
        { width, align: 'center', lineBreak: false, height: 9 },
      );
    doc
      .font('Helvetica')
      .fillColor('#64748b')
      .text(`Página ${page} de ${total}`, left, y + 30, {
        width,
        align: 'center',
        lineBreak: false,
        height: 9,
      });

    doc.page.margins.bottom = savedBottom;
    doc.x = left;
    doc.y = Math.min(doc.y, doc.page.height - savedBottom - 4);
  }

  async crearVisitante(user: JwtPayload, dto: MinutaVisitanteDto) {
    const now = this.nowBogota();
    const postId = await this.resolveCreatePostId(user, dto.postId);
    const registradoPor = this.normalizeRegistradoPor(dto.registradoPor);
    const row = await this.visitantes.save(
      this.visitantes.create({
        id: this.newId('VIS'),
        fechaRegistro: now,
        associateId: null,
        usuario: this.userName(user),
        registradoPor,
        nombreCompleto: dto.nombre.trim().toUpperCase(),
        cedula: dto.cedula?.replace(/\D/g, '') || null,
        aptoNo: dto.apto.trim(),
        acompana: (dto.acompana || 'No')
          .replace(/^si$/i, 'Si')
          .replace(/^no$/i, 'No'),
        vehiculoPlaca: dto.vehiculo
          ? dto.vehiculo.replace(/\s+/g, '').toUpperCase()
          : null,
        horaEntrada: this.fmtHm(now),
        observaciones: dto.observaciones || null,
        estado: 'ACTIVO',
        postId,
      }),
    );
    return { success: true, id: row.id, fecha: row.fechaRegistro };
  }

  async crearCorrespondencia(
    user: JwtPayload,
    dto: MinutaCorrespondenciaDto,
  ) {
    const now = this.nowBogota();
    const postId = await this.resolveCreatePostId(user, dto.postId);
    const registradoPor = this.normalizeRegistradoPor(dto.registradoPor);
    const entregado = dto.estado === 'ENTREGADO';
    const row = await this.correspondencia.save(
      this.correspondencia.create({
        id: this.newId('CORR'),
        fechaRegistro: now,
        associateId: null,
        usuario: this.userName(user),
        registradoPor,
        clase: dto.clase,
        aptoNo: dto.apto.trim(),
        destinatario: (dto.destinatario || 'Residente').trim(),
        remitente: dto.remitente || null,
        observaciones: dto.observaciones || null,
        estado: entregado ? 'ENTREGADO' : 'PENDIENTE',
        vigilanteEntrega: entregado ? registradoPor : null,
        fechaEntrega: entregado ? now : null,
        recibidoPor: entregado ? dto.recibidoPor || 'Residente' : null,
        postId,
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
    await this.assertPostAccess(user, row.postId);
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
    const postId = await this.resolveCreatePostId(user, dto.postId);
    const registradoPor = this.normalizeRegistradoPor(dto.registradoPor);
    const row = await this.contratistas.save(
      this.contratistas.create({
        id: this.newId('CONT'),
        fechaRegistro: now,
        associateId: null,
        usuario: this.userName(user),
        registradoPor,
        nombreCompleto: dto.nombre.trim().toUpperCase(),
        cedula,
        empresa: dto.empresa.trim(),
        areaTrabajo: dto.areaTrabajo || null,
        horaIngreso: this.fmtHm(now),
        equipos: dto.equipos || null,
        autorizadoPor: dto.autorizadoPor.trim(),
        observaciones: dto.observaciones || null,
        estado: 'ACTIVO',
        postId,
      }),
    );
    return { success: true, id: row.id };
  }

  async crearDomiciliario(user: JwtPayload, dto: MinutaDomiciliarioDto) {
    const now = this.nowBogota();
    const postId = await this.resolveCreatePostId(user, dto.postId);
    const registradoPor = this.normalizeRegistradoPor(dto.registradoPor);
    const row = await this.domiciliarios.save(
      this.domiciliarios.create({
        id: this.newId('DOM'),
        fechaRegistro: now,
        associateId: null,
        usuario: this.userName(user),
        registradoPor,
        empresa: dto.empresa,
        tipoPedido: dto.tipoPedido,
        aptoNo: dto.apto.trim(),
        nombreDomiciliario: dto.nombreDomiciliario || null,
        placaMoto: dto.placaMoto
          ? dto.placaMoto.replace(/\s+/g, '').toUpperCase()
          : null,
        horaLlegada: this.fmtHm(now),
        codigoPedido: dto.codigoPedido || null,
        observaciones: dto.observaciones || null,
        estado: 'ENTREGANDO',
        postId,
      }),
    );
    return { success: true, id: row.id };
  }

  async crearIncidente(user: JwtPayload, dto: MinutaIncidenteDto) {
    const now = this.nowBogota();
    const postId = await this.resolveCreatePostId(user, dto.postId);
    const registradoPor = this.normalizeRegistradoPor(dto.registradoPor);
    const row = await this.incidentes.save(
      this.incidentes.create({
        id: this.newId('INC'),
        fechaRegistro: now,
        associateId: null,
        usuario: this.userName(user),
        registradoPor,
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
        postId,
      }),
    );
    return { success: true, id: row.id, prioridad: row.prioridad };
  }

  async crearServicio(user: JwtPayload, dto: MinutaServicioDto) {
    const now = this.nowBogota();
    const postId = await this.resolveCreatePostId(user, dto.postId);
    const registradoPor = this.normalizeRegistradoPor(dto.registradoPor);
    const row = await this.servicio.save(
      this.servicio.create({
        id: this.newId('SERV'),
        fecha: this.fmtDate(now),
        hora: this.fmtTime(now),
        fechaRegistro: now,
        associateId: null,
        usuario: this.userName(user),
        registradoPor,
        anotaciones: dto.anotaciones.trim(),
        novedades: dto.novedades || null,
        postId,
      }),
    );
    return { success: true, id: row.id };
  }

  async crearEntrega(user: JwtPayload, dto: MinutaEntregaDto) {
    const now = this.nowBogota();
    const postId = await this.resolveCreatePostId(user, dto.postId);
    const registradoPor = this.normalizeRegistradoPor(dto.registradoPor);
    const row = await this.entregas.save(
      this.entregas.create({
        id: this.newId('ENT'),
        fecha: this.fmtDate(now),
        hora: this.fmtHm(now),
        fechaRegistro: now,
        associateId: null,
        registradoPor,
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
        postId,
      }),
    );
    return { success: true, id: row.id };
  }

  async registrarSalida(
    user: JwtPayload,
    id: string,
    tipo: 'VISITANTE' | 'CONTRATISTA' | 'DOMICILIARIO',
  ) {
    const now = this.nowBogota();
    if (tipo === 'VISITANTE') {
      const row = await this.visitantes.findOne({ where: { id } });
      if (!row) throw new NotFoundException('Visitante no encontrado');
      await this.assertPostAccess(user, row.postId);
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
      await this.assertPostAccess(user, row.postId);
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
    await this.assertPostAccess(user, row.postId);
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
