import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantQueryRunnerContext } from '../../common/tenant/tenant-query-runner.context';
import { AuthService } from '../auth/auth.service';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { alturaCoincide, digitsOnly, distanciaMetros } from './rondas-geo';

const ANTI_DUP_MS = 5 * 60 * 1000;

type PuntoRow = {
  id: string;
  tenant_id: string;
  post_id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  altitud: number | null;
  radio_metros: number;
  orden: number;
  activo: boolean;
  puesto_nombre?: string;
};

type MarcacionIn = {
  uuidCliente: string;
  puntoId: string;
  latitud: number;
  longitud: number;
  precisionMetros?: number;
  altitud?: number | null;
  fechaHora: string;
  dispositivoId?: string;
};

@Injectable()
export class RondasService {
  constructor(
    private readonly ds: DataSource,
    private readonly auth: AuthService,
  ) {}

  async puestosCampo() {
    return this.q(
      `SELECT id, code, name
       FROM posts
       WHERE status = 'ACTIVO'
       ORDER BY name
       LIMIT 500`,
    );
  }

  async puestosActivos(tenantId: string) {
    return this.q(
      `SELECT id, code, name, client_name AS "clientName", work_center_id AS "workCenterId"
       FROM posts
       WHERE tenant_id = $1 AND status = 'ACTIVO'
       ORDER BY name`,
      [tenantId],
    );
  }

  async asociadosCampo(postId: string) {
    if (!postId) throw new BadRequestException('Puesto requerido');
    const post = await this.postActivo(postId);
    const params: unknown[] = [post.tenant_id];
    let filtro = '';
    if (post.work_center_id) {
      filtro = ' AND a.work_center_id = $2';
      params.push(post.work_center_id);
    }
    const rows = await this.q(
      `SELECT a.id,
              TRIM(CONCAT_WS(' ', a.first_name, a.second_name, a.first_last_name, a.second_last_name)) AS nombre
       FROM associates a
       WHERE a.tenant_id = $1 AND a.status = 'ACTIVO'${filtro}
       ORDER BY a.first_last_name, a.first_name
       LIMIT 400`,
      params,
    );
    return { post: { id: post.id, name: post.name }, asociados: rows };
  }

  async entrarCampo(dto: {
    postId: string;
    associateId: string;
    documentNumber: string;
  }) {
    const cedula = digitsOnly(dto.documentNumber);
    if (cedula.length < 5) {
      throw new UnauthorizedException('Cédula inválida');
    }
    const post = await this.postActivo(dto.postId);
    const [aso] = await this.q(
      `SELECT id, tenant_id, document_number,
              TRIM(CONCAT_WS(' ', first_name, second_name, first_last_name, second_last_name)) AS nombre,
              status
       FROM associates WHERE id = $1`,
      [dto.associateId],
    );
    if (!aso || aso.status !== 'ACTIVO' || aso.tenant_id !== post.tenant_id) {
      throw new UnauthorizedException('Asociado no válido');
    }
    if (digitsOnly(aso.document_number) !== cedula) {
      throw new UnauthorizedException('El documento no coincide');
    }
    const accessToken = await this.auth.signCampoAccess({
      associateId: aso.id,
      postId: post.id,
      tenantId: post.tenant_id,
    });
    return {
      accessToken,
      vigilante: { id: aso.id, nombre: aso.nombre },
      post: { id: post.id, name: post.name },
    };
  }

  async puntosDePost(postId: string, tenantId: string, incluirInactivos = false) {
    const filtro = incluirInactivos ? '' : ' AND p.activo = true';
    return this.q(
      `SELECT p.id, p.post_id AS "postId", p.nombre, p.latitud, p.longitud,
              p.altitud, p.radio_metros AS "radioMetros", p.orden, p.activo,
              pu.name AS "puestoNombre"
       FROM rondas_puntos p
       JOIN posts pu ON pu.id = p.post_id
       WHERE p.tenant_id = $1 AND p.post_id = $2${filtro}
       ORDER BY p.orden, p.nombre`,
      [tenantId, postId],
    );
  }

  async crearPunto(
    user: JwtPayload,
    dto: {
      postId: string;
      nombre: string;
      latitud: number;
      longitud: number;
      altitud?: number | null;
      radioMetros?: number;
      orden?: number;
    },
  ) {
    this.assertCoords(dto.latitud, dto.longitud);
    const nombre = (dto.nombre || '').trim();
    if (nombre.length < 2) throw new BadRequestException('Nombre del punto');
    const radio = this.radio(dto.radioMetros);
    const post = await this.postActivo(dto.postId);
    if (post.tenant_id !== user.tenantId) {
      throw new ForbiddenException();
    }
    const altitud =
      dto.altitud == null || !Number.isFinite(Number(dto.altitud))
        ? null
        : Number(dto.altitud);
    const [row] = await this.q(
      `INSERT INTO rondas_puntos
        (tenant_id, post_id, nombre, latitud, longitud, altitud, radio_metros, orden, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, post_id AS "postId", nombre, latitud, longitud, altitud,
                 radio_metros AS "radioMetros", orden, activo`,
      [
        user.tenantId,
        post.id,
        nombre,
        dto.latitud,
        dto.longitud,
        altitud,
        radio,
        dto.orden ?? 1,
        user.sub,
      ],
    );
    return row;
  }

  async actualizarPunto(
    user: JwtPayload,
    id: string,
    dto: {
      nombre?: string;
      latitud?: number;
      longitud?: number;
      radioMetros?: number;
      orden?: number;
      activo?: boolean;
    },
  ) {
    const [cur] = await this.q(
      `SELECT * FROM rondas_puntos WHERE id = $1 AND tenant_id = $2`,
      [id, user.tenantId],
    );
    if (!cur) throw new BadRequestException('Punto no existe');
    const lat = dto.latitud ?? Number(cur.latitud);
    const lng = dto.longitud ?? Number(cur.longitud);
    this.assertCoords(lat, lng);
    const nombre = (dto.nombre ?? cur.nombre).trim();
    const [row] = await this.q(
      `UPDATE rondas_puntos SET
         nombre = $3, latitud = $4, longitud = $5,
         radio_metros = $6, orden = $7, activo = $8
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, post_id AS "postId", nombre, latitud, longitud,
                 radio_metros AS "radioMetros", orden, activo`,
      [
        id,
        user.tenantId,
        nombre,
        lat,
        lng,
        dto.radioMetros != null ? this.radio(dto.radioMetros) : cur.radio_metros,
        dto.orden ?? cur.orden,
        dto.activo ?? cur.activo,
      ],
    );
    return row;
  }

  async registrarLote(user: JwtPayload, marcaciones: MarcacionIn[]) {
    if (!user.associateId || !user.postId) {
      throw new ForbiddenException('Sesión de campo inválida');
    }
    if (!Array.isArray(marcaciones) || !marcaciones.length) {
      throw new BadRequestException('Envía al menos una marcación');
    }
    if (marcaciones.length > 200) {
      throw new BadRequestException('Máximo 200 marcaciones por envío');
    }
    const aceptadas: string[] = [];
    const duplicadas: string[] = [];
    const rechazadas: { uuid: string; motivo: string }[] = [];

    for (const m of marcaciones) {
      const uuid = (m.uuidCliente || '').trim();
      if (!uuid) {
        rechazadas.push({ uuid: '', motivo: 'uuid' });
        continue;
      }
      try {
        const punto = await this.puntoActivo(m.puntoId, user.tenantId);
        if (punto.post_id !== user.postId) {
          rechazadas.push({ uuid, motivo: 'punto-ajeno' });
          continue;
        }
        const dist = distanciaMetros(
          m.latitud,
          m.longitud,
          Number(punto.latitud),
          Number(punto.longitud),
        );
        if (dist > Number(punto.radio_metros)) {
          rechazadas.push({ uuid, motivo: 'fuera-radio' });
          continue;
        }
        const precision = Number(m.precisionMetros ?? 0);
        const radio = Number(punto.radio_metros) || 10;
        if (precision > Math.max(15, radio)) {
          rechazadas.push({ uuid, motivo: 'precision' });
          continue;
        }
        if (!alturaCoincide(punto.altitud, m.altitud)) {
          rechazadas.push({ uuid, motivo: 'altura' });
          continue;
        }
        const fecha = new Date(m.fechaHora);
        if (Number.isNaN(fecha.getTime())) {
          rechazadas.push({ uuid, motivo: 'fecha' });
          continue;
        }
        const [dup] = await this.q(
          `SELECT 1 AS ok FROM rondas_marcaciones
           WHERE associate_id = $1 AND punto_id = $2
             AND fecha_hora > $3
           LIMIT 1`,
          [user.associateId, punto.id, new Date(fecha.getTime() - ANTI_DUP_MS)],
        );
        if (dup) {
          duplicadas.push(uuid);
          continue;
        }
        const info = await this.q(
          `INSERT INTO rondas_marcaciones
            (tenant_id, uuid_cliente, punto_id, associate_id, post_id,
             latitud, longitud, precision_metros, distancia_al_punto, altitud,
             fecha_hora, dispositivo_id, es_mock)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,false)
           ON CONFLICT (uuid_cliente) DO NOTHING
           RETURNING id`,
          [
            user.tenantId,
            uuid,
            punto.id,
            user.associateId,
            user.postId,
            m.latitud,
            m.longitud,
            precision || null,
            Math.round(dist * 10) / 10,
            m.altitud ?? null,
            fecha.toISOString(),
            m.dispositivoId || null,
          ],
        );
        if (info.length) aceptadas.push(uuid);
        else duplicadas.push(uuid);
      } catch {
        rechazadas.push({ uuid, motivo: 'error' });
      }
    }

    return { aceptadas, duplicadas, rechazadas };
  }

  async mias(user: JwtPayload) {
    return this.q(
      `SELECT m.id, m.uuid_cliente AS "uuidCliente", m.punto_id AS "puntoId",
              p.nombre AS "puntoNombre", m.latitud, m.longitud,
              m.precision_metros AS "precisionMetros",
              m.distancia_al_punto AS "distanciaAlPunto",
              m.fecha_hora AS "fechaHora", m.created_at AS "creadoEn"
       FROM rondas_marcaciones m
       JOIN rondas_puntos p ON p.id = m.punto_id
       WHERE m.associate_id = $1 AND m.post_id = $2
       ORDER BY m.fecha_hora DESC
       LIMIT 500`,
      [user.associateId, user.postId],
    );
  }

  async hoy(user: JwtPayload, postId?: string) {
    const { inicio, fin } = rangoBogota();
    const params: unknown[] = [user.tenantId, inicio, fin];
    let filtroPost = '';
    if (postId) {
      filtroPost = ' AND m.post_id = $4';
      params.push(postId);
    }
    const marcaciones = await this.q(
      `SELECT m.id, m.fecha_hora AS "fechaHora", m.latitud, m.longitud,
              m.distancia_al_punto AS "distanciaAlPunto",
              m.precision_metros AS "precisionMetros",
              p.nombre AS "puntoNombre", pu.name AS "puestoNombre",
              TRIM(CONCAT_WS(' ', a.first_name, a.first_last_name)) AS "vigilanteNombre",
              ABS(EXTRACT(EPOCH FROM (m.fecha_hora - m.created_at))) > 600 AS "desfaseReloj"
       FROM rondas_marcaciones m
       JOIN rondas_puntos p ON p.id = m.punto_id
       JOIN posts pu ON pu.id = m.post_id
       JOIN associates a ON a.id = m.associate_id
       WHERE m.tenant_id = $1 AND m.fecha_hora >= $2 AND m.fecha_hora < $3${filtroPost}
       ORDER BY m.fecha_hora DESC
       LIMIT 200`,
      params,
    );

    const puntosParams: unknown[] = [user.tenantId];
    let puntosFiltro = '';
    if (postId) {
      puntosFiltro = ' AND p.post_id = $2';
      puntosParams.push(postId);
    }
    const esperados = await this.q(
      `SELECT p.post_id AS "postId", pu.name AS "puestoNombre", COUNT(*)::int AS n
       FROM rondas_puntos p
       JOIN posts pu ON pu.id = p.post_id
       WHERE p.tenant_id = $1 AND p.activo = true${puntosFiltro}
       GROUP BY p.post_id, pu.name`,
      puntosParams,
    );
    const marcados = await this.q(
      `SELECT m.post_id AS "postId", COUNT(DISTINCT m.punto_id)::int AS n
       FROM rondas_marcaciones m
       WHERE m.tenant_id = $1 AND m.fecha_hora >= $2 AND m.fecha_hora < $3${filtroPost}
       GROUP BY m.post_id`,
      params,
    );
    const porPost = new Map<string, number>(
      marcados.map((r: { postId: string; n: number }) => [r.postId, r.n]),
    );
    const cumplimiento = esperados.map(
      (e: { postId: string; puestoNombre: string; n: number }) => {
        const hechos = porPost.get(e.postId) || 0;
        return {
          postId: e.postId,
          puestoNombre: e.puestoNombre,
          esperados: e.n,
          marcados: hechos,
          porcentaje: e.n ? Math.round((hechos / e.n) * 100) : 0,
          completa: e.n > 0 && hechos >= e.n,
        };
      },
    );
    const esperadosTotal = cumplimiento.reduce(
      (s: number, c: { esperados: number }) => s + c.esperados,
      0,
    );
    const marcadosTotal = cumplimiento.reduce(
      (s: number, c: { marcados: number }) => s + c.marcados,
      0,
    );
    return {
      fecha: ymdBogota(),
      cumplimientoPct: esperadosTotal
        ? Math.round((marcadosTotal / esperadosTotal) * 100)
        : 0,
      rondasCompletas: cumplimiento.filter((c: { completa: boolean }) => c.completa)
        .length,
      puestos: cumplimiento.length,
      porPuesto: cumplimiento,
      marcaciones,
    };
  }

  async puntosTodos(user: JwtPayload, postId?: string) {
    const params: unknown[] = [user.tenantId];
    let filtro = '';
    if (postId) {
      filtro = ' AND p.post_id = $2';
      params.push(postId);
    }
    return this.q(
      `SELECT p.id, p.post_id AS "postId", p.nombre, p.latitud, p.longitud,
              p.altitud, p.radio_metros AS "radioMetros", p.orden, p.activo,
              pu.name AS "puestoNombre"
       FROM rondas_puntos p
       JOIN posts pu ON pu.id = p.post_id
       WHERE p.tenant_id = $1${filtro}
       ORDER BY pu.name, p.orden, p.nombre`,
      params,
    );
  }

  private async postActivo(postId: string): Promise<{
    id: string;
    name: string;
    tenant_id: string;
    work_center_id: string | null;
  }> {
    const [post] = await this.q(
      `SELECT id, name, tenant_id, work_center_id
       FROM posts WHERE id = $1 AND status = 'ACTIVO'`,
      [postId],
    );
    if (!post) throw new BadRequestException('Puesto no válido');
    return post;
  }

  private async puntoActivo(id: string, tenantId: string): Promise<PuntoRow> {
    const [p] = await this.q(
      `SELECT * FROM rondas_puntos WHERE id = $1 AND tenant_id = $2 AND activo = true`,
      [id, tenantId],
    );
    if (!p) throw new BadRequestException('Punto no válido');
    return p;
  }

  private q(sql: string, params: unknown[] = []): Promise<any> {
    const qr = TenantQueryRunnerContext.getOptional();
    return qr ? qr.query(sql, params) : this.ds.query(sql, params);
  }

  private radio(n?: number) {
    const v = Number(n ?? 10);
    if (!Number.isFinite(v) || v < 6 || v > 25) {
      throw new BadRequestException('Radio entre 6 y 25 m');
    }
    return Math.round(v);
  }

  private assertCoords(lat: number, lng: number) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestException('Coordenadas inválidas');
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new BadRequestException('Coordenadas fuera de rango');
    }
  }
}

function ymdBogota(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function rangoBogota(desde?: string, hasta?: string) {
  const hoy = ymdBogota();
  const d = desde || hoy;
  const h = hasta || hoy;
  return { inicio: `${d}T05:00:00.000Z`, fin: finExclusivo(h) };
}

function finExclusivo(ymd: string) {
  const [y, m, day] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day + 1, 5, 0, 0)).toISOString();
}
