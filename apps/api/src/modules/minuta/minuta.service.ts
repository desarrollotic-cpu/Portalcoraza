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
    // Orden cronológico: desde el primer registro hasta el último del periodo
    const rows = [...data.historial].sort(
      (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime(),
    );

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 36, left: 36, right: 36, bottom: 65 },
      bufferPages: true,
      info: {
        Title: `Minuta Oficial - ${data.post.name} - ${data.month}`,
        Author: 'CORAZA SEGURIDAD C.T.A.',
        Subject: 'Minuta Virtual de Operaciones',
        Keywords: 'Seguridad, Minuta, Operaciones, Coraza',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const left = 36;
    const pageWidth = doc.page.width; // 595.28
    const pageHeight = doc.page.height; // 841.89
    const contentWidth = pageWidth - left * 2; // 523.28

    const drawHeader = (isFirstPage: boolean) => {
      if (isFirstPage) {
        // TOP CORPORATE BANNER
        doc
          .rect(left, 36, contentWidth, 54)
          .fillColor('#0f172a')
          .fill();

        // Gold line accent
        doc
          .rect(left, 88, contentWidth, 2.5)
          .fillColor('#d97706')
          .fill();

        // Left Branding
        doc
          .fontSize(12)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text('CORAZA SEGURIDAD C.T.A.', left + 14, 46);
        doc
          .fontSize(7.5)
          .font('Helvetica')
          .fillColor('#94a3b8')
          .text(
            'Cooperativa de Trabajo Asociado · NIT: 811.021.524-8 · Licencia SuperVigilancia Resol. No. 0002848',
            left + 14,
            61,
          );
        doc
          .fontSize(7)
          .font('Helvetica')
          .fillColor('#cbd5e1')
          .text(
            'Medellín, Colombia · PBX: (604) 448 2027 · contacto@corazaseguridad.com',
            left + 14,
            73,
          );

        // Right Badge Box
        const badgeW = 165;
        const badgeH = 38;
        const badgeX = left + contentWidth - badgeW - 10;
        const badgeY = 44;

        doc
          .roundedRect(badgeX, badgeY, badgeW, badgeH, 4)
          .fillColor('#1e293b')
          .fill();
        doc
          .roundedRect(badgeX, badgeY, badgeW, badgeH, 4)
          .lineWidth(0.8)
          .strokeColor('#0284c7')
          .stroke();

        doc
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .fillColor('#38bdf8')
          .text('INFORME DE MINUTA VIRTUAL', badgeX, badgeY + 8, {
            width: badgeW,
            align: 'center',
          });
        doc
          .fontSize(7)
          .font('Helvetica')
          .fillColor('#e2e8f0')
          .text('REGISTRO OFICIAL DE OPERACIONES', badgeX, badgeY + 22, {
            width: badgeW,
            align: 'center',
          });

        // METADATA CARD
        const cardY = 98;
        const cardH = 68;
        doc
          .roundedRect(left, cardY, contentWidth, cardH, 5)
          .fillColor('#f8fafc')
          .fill();
        doc
          .roundedRect(left, cardY, contentWidth, cardH, 5)
          .lineWidth(0.8)
          .strokeColor('#cbd5e1')
          .stroke();

        // Left Column in Card
        const col1X = left + 14;
        const col2X = left + 270;

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748b').text('PUESTO DE SERVICIO:', col1X, cardY + 10);
        doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#0f172a').text(`${data.post.code} — ${data.post.name}`, col1X, cardY + 21, { width: 240 });

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748b').text('PERIODO DE OPERACIÓN:', col1X, cardY + 39);
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#0369a1').text(`Mes: ${data.month}`, col1X, cardY + 50);

        // Right Column in Card
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748b').text('FECHA Y HORA DE EMISIÓN:', col2X, cardY + 10);
        doc.fontSize(8.5).font('Helvetica').fillColor('#0f172a').text(`${this.fmtDate(this.nowBogota())} ${this.fmtHm(this.nowBogota())} (Hora Legal Col)`, col2X, cardY + 21);

        doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#64748b').text('TOTAL ANOTACIONES REGISTRADAS:', col2X, cardY + 39);
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#15803d').text(`${rows.length} Registro(s) en Bitácora`, col2X, cardY + 50);

        doc.y = cardY + cardH + 14;
      } else {
        // MINI HEADER FOR SUBSEQUENT PAGES
        doc
          .rect(left, 36, contentWidth, 24)
          .fillColor('#0f172a')
          .fill();
        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text(`CORAZA SEGURIDAD C.T.A. · MINUTA VIRTUAL — ${data.post.code} (${data.month})`, left + 10, 43);
        doc
          .fontSize(7.5)
          .font('Helvetica')
          .fillColor('#38bdf8')
          .text(`Generado: ${this.fmtDate(this.nowBogota())}`, left + contentWidth - 140, 43, { width: 130, align: 'right' });
        doc.y = 68;
      }
    };

    drawHeader(true);

    // SECTION TITLE
    doc
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .fillColor('#0f172a')
      .text('BITÁCORA OPERATIVA Y NOVEDADES REGISTRADAS', left, doc.y);
    doc
      .fontSize(7.5)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('Trazabilidad cronológica de servicio, control de acceso, paquetería y relevos.', left, doc.y + 11);
    doc.y += 18;

    // DIVIDER
    doc
      .moveTo(left, doc.y)
      .lineTo(left + contentWidth, doc.y)
      .lineWidth(0.8)
      .strokeColor('#e2e8f0')
      .stroke();
    doc.y += 8;

    if (!rows.length) {
      doc
        .roundedRect(left, doc.y, contentWidth, 40, 4)
        .fillColor('#f8fafc')
        .fill();
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('No se encontraron registros u operaciones en la minuta virtual para este puesto y periodo.', left + 14, doc.y + 14, { align: 'center', width: contentWidth - 28 });
    } else {
      const typeStyles: Record<string, { label: string; bg: string; border: string; accent: string; badgeBg: string }> = {
        SERVICIO: { label: 'SERVICIO / TURNO', bg: '#f0fdf4', border: '#bbf7d0', accent: '#16a34a', badgeBg: '#15803d' },
        VISITANTE: { label: 'CONTROL VISITANTE', bg: '#eff6ff', border: '#bfdbfe', accent: '#2563eb', badgeBg: '#1d4ed8' },
        CORRESPONDENCIA: { label: 'CORRESPONDENCIA', bg: '#faf5ff', border: '#e9d5ff', accent: '#9333ea', badgeBg: '#7e22ce' },
        CONTRATISTA: { label: 'CONTRATISTA', bg: '#ecfeff', border: '#a5f3fc', accent: '#0891b2', badgeBg: '#0e7490' },
        DOMICILIARIO: { label: 'DOMICILIARIO', bg: '#fffbeb', border: '#fde68a', accent: '#d97706', badgeBg: '#b45309' },
        INCIDENTE: { label: 'INCIDENTE / ALERTA', bg: '#fef2f2', border: '#fecaca', accent: '#dc2626', badgeBg: '#b91c1c' },
        ENTREGA: { label: 'RELEVO DE PUESTO', bg: '#f8fafc', border: '#cbd5e1', accent: '#475569', badgeBg: '#334155' },
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const when = new Date(row.fecha);
        const style = typeStyles[row.tipo] || {
          label: row.tipo,
          bg: '#f8fafc',
          border: '#e2e8f0',
          accent: '#64748b',
          badgeBg: '#475569',
        };

        const dateStr = `${this.fmtDate(when)} · ${this.fmtHm(when)} (Col)`;
        
        // Prepare detail lines
        const details = { ...(row.detalles || {}) };
        delete details['id'];
        delete details['estado'];
        delete details['registradoPor'];
        delete details['fechaRegistro'];
        delete details['fecha'];
        delete details['hora'];

        const lines = this.pdfDetailLines(details);
        const detailText = lines.length ? lines.join('  |  ') : (row.resumen || 'Sin novedades.');
        
        doc.fontSize(8).font('Helvetica');
        const textHeight = doc.heightOfString(detailText, { width: contentWidth - 28 });
        const cardHeight = Math.max(48, textHeight + 36);

        if (doc.y + cardHeight > 750) {
          doc.addPage();
          drawHeader(false);
        }

        const startY = doc.y;

        // Card background & border
        doc
          .roundedRect(left, startY, contentWidth, cardHeight, 4)
          .fillColor(style.bg)
          .fill();
        doc
          .roundedRect(left, startY, contentWidth, cardHeight, 4)
          .lineWidth(0.6)
          .strokeColor(style.border)
          .stroke();

        // Left color accent bar
        doc
          .roundedRect(left, startY, 4, cardHeight, 2)
          .fillColor(style.accent)
          .fill();

        // Item Header Row
        const badgeText = `${i + 1}. ${style.label}`;
        doc.fontSize(7.5).font('Helvetica-Bold');
        const bWidth = doc.widthOfString(badgeText) + 12;

        doc
          .roundedRect(left + 12, startY + 6, bWidth, 14, 3)
          .fillColor(style.badgeBg)
          .fill();
        doc
          .fontSize(7.5)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text(badgeText, left + 18, startY + 9);

        doc
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .fillColor('#0f172a')
          .text(`ID: ${row.id}`, left + 18 + bWidth + 6, startY + 8);

        doc
          .fontSize(7.5)
          .font('Helvetica')
          .fillColor('#475569')
          .text(`📅 ${dateStr}  ·  👤 ${row.registradoPor || 'JHON'}`, left + 18 + bWidth + 120, startY + 9);

        const statusStr = row.estado && row.estado !== '—' ? `[ ${row.estado} ]` : '';
        if (statusStr) {
          doc
            .fontSize(7.5)
            .font('Helvetica-Bold')
            .fillColor(style.accent)
            .text(statusStr, left + contentWidth - 85, startY + 9, { width: 75, align: 'right' });
        }

        // Divider inside card
        doc
          .moveTo(left + 12, startY + 23)
          .lineTo(left + contentWidth - 12, startY + 23)
          .lineWidth(0.4)
          .strokeColor(style.border)
          .stroke();

        // Body Content
        doc
          .fontSize(8)
          .font('Helvetica')
          .fillColor('#1e293b')
          .text(detailText, left + 14, startY + 27, { width: contentWidth - 28 });

        doc.y = startY + cardHeight + 6;
      }
    }

    // MULTI-PAGE FOOTER PASS
    const range = doc.bufferedPageRange();
    for (let p = 0; p < range.count; p++) {
      doc.switchToPage(p);
      this.drawMinutaPdfFooter(doc, p + 1, range.count);
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
        'NIT 9004347273 · Carrera 81 No. 49-24 · PBX 444 79 29 · Tel. 234 79 29 · Medellín - Antioquia',
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
