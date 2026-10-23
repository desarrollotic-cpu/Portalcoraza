import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
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

  /**
   * Entrada desde el celular: nombre de la ronda y su clave.
   *
   * Rondas no identifica al vigilante —  ni le hace falta a la central, que
   * solo necesita saber si el puesto hizo la ronda. Antes se pedia nombre y
   * cedula del asociado; ahora el celular entra como la ronda.
   */
  async entrarCampo(dto: { nombre: string; clave: string }) {
    const nombre = (dto.nombre || '').trim();
    const clave = (dto.clave || '').trim();
    if (!nombre || !clave) {
      throw new UnauthorizedException('Escribe el nombre de la ronda y la clave.');
    }

    const [ruta] = await this.q(
      `SELECT r.id, r.tenant_id, r.post_id, r.nombre, r.clave_hash, r.activo,
              pu.name AS post_name, pu.status AS post_status
         FROM rondas_rutas r
         JOIN posts pu ON pu.id = r.post_id
        WHERE LOWER(r.nombre) = LOWER($1)`,
      [nombre],
    );

    // Mismo mensaje exista o no la ronda: no se le dice a nadie que nombres hay.
    const generico = new UnauthorizedException('Nombre de ronda o clave incorrectos.');
    if (!ruta || !ruta.activo) throw generico;
    if (ruta.clave_hash === '!sin-clave') {
      throw new UnauthorizedException(
        'Esta ronda todavia no tiene clave. Pidele a Sistemas que le ponga una.',
      );
    }
    if (!(await bcrypt.compare(clave, ruta.clave_hash))) throw generico;
    if (ruta.post_status === 'INACTIVO') {
      throw new UnauthorizedException('El puesto de esta ronda esta inactivo.');
    }

    const accessToken = await this.auth.signCampoAccess({
      rutaId: ruta.id,
      postId: ruta.post_id,
      tenantId: ruta.tenant_id,
    });
    return {
      accessToken,
      ronda: { id: ruta.id, nombre: ruta.nombre },
      post: { id: ruta.post_id, name: ruta.post_name },
    };
  }

  /**
   * Rondas configuradas, con cuántos puntos tiene cada una.
   *
   * Nunca devuelve `clave_hash`: la clave solo se escribe, no se lee.
   */
  async listarRutas(tenantId: string, postId?: string) {
    const filtro = postId ? ' AND r.post_id = $2' : '';
    const params: unknown[] = postId ? [tenantId, postId] : [tenantId];
    return this.q(
      `SELECT r.id, r.post_id AS "postId", r.nombre, r.activo,
              pu.name AS "puestoNombre",
              (SELECT COUNT(*) FROM rondas_puntos p
                WHERE p.ruta_id = r.id AND p.activo = true)::int AS "puntos",
              (r.clave_hash = '!sin-clave') AS "sinClave"
         FROM rondas_rutas r
         JOIN posts pu ON pu.id = r.post_id
        WHERE r.tenant_id = $1${filtro}
        ORDER BY r.nombre`,
      params,
    );
  }

  /** Crea la ronda. El nombre es con lo que se entra desde el celular. */
  async crearRuta(
    user: JwtPayload,
    dto: { postId: string; nombre: string; clave: string },
  ) {
    const nombre = (dto.nombre || '').trim();
    if (nombre.length < 3) {
      throw new BadRequestException('El nombre de la ronda debe tener al menos 3 caracteres.');
    }
    this.assertClave(dto.clave);

    const post = await this.postActivo(dto.postId);
    if (post.tenant_id !== user.tenantId) throw new ForbiddenException();

    const [repetido] = await this.q(
      `SELECT 1 FROM rondas_rutas WHERE tenant_id = $1 AND LOWER(nombre) = LOWER($2)`,
      [user.tenantId, nombre],
    );
    if (repetido) {
      throw new BadRequestException(
        `Ya existe una ronda llamada «${nombre}». El nombre es con lo que se entra, así que no puede repetirse.`,
      );
    }

    const [row] = await this.q(
      `INSERT INTO rondas_rutas (tenant_id, post_id, nombre, clave_hash, created_by)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id, post_id AS "postId", nombre, activo`,
      [user.tenantId, post.id, nombre, await bcrypt.hash(dto.clave, 12), user.sub],
    );
    return { ...row, puestoNombre: post.name, puntos: 0, sinClave: false };
  }

  /** Renombrar, cambiar la clave o desactivar. La clave solo si viene. */
  async actualizarRuta(
    user: JwtPayload,
    id: string,
    dto: { nombre?: string; clave?: string; activo?: boolean },
  ) {
    const ruta = await this.rutaDe(id, user.tenantId);
    const sets: string[] = [];
    const params: unknown[] = [];

    if (dto.nombre !== undefined) {
      const nombre = dto.nombre.trim();
      if (nombre.length < 3) {
        throw new BadRequestException('El nombre de la ronda debe tener al menos 3 caracteres.');
      }
      const [repetido] = await this.q(
        `SELECT 1 FROM rondas_rutas
          WHERE tenant_id = $1 AND LOWER(nombre) = LOWER($2) AND id <> $3`,
        [user.tenantId, nombre, id],
      );
      if (repetido) throw new BadRequestException(`Ya existe una ronda llamada «${nombre}».`);
      params.push(nombre);
      sets.push(`nombre = $${params.length}`);
    }
    if (dto.clave !== undefined) {
      this.assertClave(dto.clave);
      params.push(await bcrypt.hash(dto.clave, 12));
      sets.push(`clave_hash = $${params.length}`);
    }
    if (dto.activo !== undefined) {
      params.push(!!dto.activo);
      sets.push(`activo = $${params.length}`);
    }
    if (!sets.length) return ruta;

    params.push(id, user.tenantId);
    const [row] = await this.q(
      `UPDATE rondas_rutas SET ${sets.join(', ')}
        WHERE id = $${params.length - 1} AND tenant_id = $${params.length}
        RETURNING id, post_id AS "postId", nombre, activo`,
      params,
    );
    return row;
  }

  /** Borra la ronda y, en cascada, sus puntos. Las marcaciones no se tocan. */
  async eliminarRuta(user: JwtPayload, id: string) {
    await this.rutaDe(id, user.tenantId);
    await this.q(`DELETE FROM rondas_rutas WHERE id = $1 AND tenant_id = $2`, [
      id,
      user.tenantId,
    ]);
    return { ok: true, id };
  }

  async puntosDeRuta(rutaId: string, tenantId: string) {
    return this.q(
      `SELECT p.id, p.ruta_id AS "rutaId", p.post_id AS "postId", p.nombre,
              p.latitud, p.longitud, p.altitud, p.radio_metros AS "radioMetros",
              p.orden, p.activo
         FROM rondas_puntos p
        WHERE p.tenant_id = $1 AND p.ruta_id = $2 AND p.activo = true
        ORDER BY p.orden, p.nombre`,
      [tenantId, rutaId],
    );
  }

  private async rutaDe(id: string, tenantId: string) {
    const [row] = await this.q(
      `SELECT r.id, r.post_id AS "postId", r.nombre, r.activo
         FROM rondas_rutas r WHERE r.id = $1 AND r.tenant_id = $2`,
      [id, tenantId],
    );
    if (!row) throw new BadRequestException('La ronda no existe.');
    return row;
  }

  /** Corta la ronda si se entra desde el celular; por eso no puede ser trivial. */
  private assertClave(clave: string) {
    const v = (clave || '').trim();
    if (v.length < 4) {
      throw new BadRequestException('La clave debe tener al menos 4 caracteres.');
    }
    if (v.length > 64) {
      throw new BadRequestException('La clave es demasiado larga.');
    }
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
      /** Ronda a la que pertenece. El puesto sale de ella. */
      rutaId: string;
      nombre: string;
      latitud: number;
      longitud: number;
      altitud?: number | null;
      radioMetros?: number;
      precisionMetros?: number;
      orden?: number;
    },
  ) {
    this.assertCoords(dto.latitud, dto.longitud);
    const nombre = (dto.nombre || '').trim();
    if (nombre.length < 2) throw new BadRequestException('Nombre del punto');
    const radio = this.radio(dto.radioMetros);
    const precision = Number(dto.precisionMetros);
    if (Number.isFinite(precision) && precision > radio) {
      throw new BadRequestException(
        `GPS ±${Math.round(precision)} m es peor que el radio ${radio} m. No se guarda.`,
      );
    }
    const ruta = await this.rutaDe(dto.rutaId, user.tenantId);
    const post = await this.postActivo(ruta.postId);
    if (post.tenant_id !== user.tenantId) {
      throw new ForbiddenException();
    }
    // El orden lo pone el servidor: van quedando en el orden en que se toman.
    const [{ siguiente }] = await this.q(
      `SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente
         FROM rondas_puntos WHERE ruta_id = $1`,
      [ruta.id],
    );
    const altitud =
      dto.altitud == null || !Number.isFinite(Number(dto.altitud))
        ? null
        : Number(dto.altitud);
    const [row] = await this.q(
      `INSERT INTO rondas_puntos
        (tenant_id, ruta_id, post_id, nombre, latitud, longitud, altitud,
         radio_metros, orden, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, ruta_id AS "rutaId", post_id AS "postId", nombre, latitud,
                 longitud, altitud, radio_metros AS "radioMetros", orden, activo`,
      [
        user.tenantId,
        ruta.id,
        post.id,
        nombre,
        dto.latitud,
        dto.longitud,
        altitud,
        radio,
        dto.orden ?? siguiente,
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

  async eliminarPunto(user: JwtPayload, id: string) {
    const [row] = await this.q(
      `UPDATE rondas_puntos SET activo = false
       WHERE id = $1 AND tenant_id = $2 AND activo = true
       RETURNING id`,
      [id, user.tenantId],
    );
    if (!row) throw new BadRequestException('Punto no existe');
    return { ok: true, id: row.id };
  }

  async registrarLote(user: JwtPayload, marcaciones: MarcacionIn[]) {
    if (!user.rutaId || !user.postId) {
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
        const radio = Number(punto.radio_metros) || 8;
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
           WHERE ruta_id = $1 AND punto_id = $2
             AND fecha_hora > $3
           LIMIT 1`,
          [user.rutaId, punto.id, new Date(fecha.getTime() - ANTI_DUP_MS)],
        );
        if (dup) {
          duplicadas.push(uuid);
          continue;
        }
        const info = await this.q(
          `INSERT INTO rondas_marcaciones
            (tenant_id, uuid_cliente, punto_id, ruta_id, post_id,
             latitud, longitud, precision_metros, distancia_al_punto, altitud,
             fecha_hora, dispositivo_id, es_mock)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,false)
           ON CONFLICT (uuid_cliente) DO NOTHING
           RETURNING id`,
          [
            user.tenantId,
            uuid,
            punto.id,
            user.rutaId,
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

  async registrarAlertas(
    user: JwtPayload,
    items: Array<{
      uuidCliente: string;
      tipo: string;
      mensaje?: string;
      latitud?: number | null;
      longitud?: number | null;
      fechaHora: string;
      dispositivoId?: string;
    }>,
  ) {
    if (!user.rutaId || !user.postId) {
      throw new ForbiddenException('Sesión de campo inválida');
    }
    const tipos = new Set(['EMERGENCIA', 'INCIDENTE', 'APOYO', 'NOVEDAD']);
    const aceptadas: string[] = [];
    const duplicadas: string[] = [];
    const rechazadas: { uuid: string; motivo: string }[] = [];
    for (const a of items || []) {
      const uuid = (a.uuidCliente || '').trim();
      const tipo = (a.tipo || '').trim().toUpperCase();
      if (!uuid) {
        rechazadas.push({ uuid: '', motivo: 'uuid' });
        continue;
      }
      if (!tipos.has(tipo)) {
        rechazadas.push({ uuid, motivo: 'tipo' });
        continue;
      }
      const fecha = new Date(a.fechaHora);
      if (Number.isNaN(fecha.getTime())) {
        rechazadas.push({ uuid, motivo: 'fecha' });
        continue;
      }
      const mensaje = (a.mensaje || '').trim().slice(0, 400);
      try {
        const info = await this.q(
          `INSERT INTO rondas_alertas
            (tenant_id, uuid_cliente, post_id, ruta_id, tipo, mensaje,
             latitud, longitud, fecha_hora, dispositivo_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           ON CONFLICT (uuid_cliente) DO NOTHING
           RETURNING id`,
          [
            user.tenantId,
            uuid,
            user.postId,
            user.rutaId,
            tipo,
            mensaje,
            a.latitud ?? null,
            a.longitud ?? null,
            fecha.toISOString(),
            a.dispositivoId || null,
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
       WHERE m.ruta_id = $1 AND m.post_id = $2
       ORDER BY m.fecha_hora DESC
       LIMIT 500`,
      [user.rutaId, user.postId],
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
    const alertaFiltro = postId ? ' AND al.post_id = $4' : '';
    const alertas = await this.q(
      `SELECT al.id, al.tipo, al.mensaje, al.fecha_hora AS "fechaHora",
              al.latitud, al.longitud, pu.name AS "puestoNombre",
              TRIM(CONCAT_WS(' ', a.first_name, a.first_last_name)) AS "vigilanteNombre"
       FROM rondas_alertas al
       JOIN posts pu ON pu.id = al.post_id
       JOIN associates a ON a.id = al.associate_id
       WHERE al.tenant_id = $1 AND al.fecha_hora >= $2 AND al.fecha_hora < $3${alertaFiltro}
       ORDER BY al.fecha_hora DESC
       LIMIT 100`,
      params,
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
      alertas,
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
    const v = Number(n ?? 8);
    if (!Number.isFinite(v) || v < 8 || v > 25) {
      throw new BadRequestException('Radio entre 8 y 25 m');
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
