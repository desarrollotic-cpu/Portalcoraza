import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Associate,
  AssociateStatus,
} from '../associates/entities/associate.entity';
import { Delivery } from '../deliveries/entities/delivery.entity';
import { Post, PostStatus } from '../posts/entities/post.entity';
import {
  VigiaCierreTurnoDto,
  VigiaCreateMinutaDto,
  VigiaFirmarDotacionDto,
  VigiaLoginDto,
  VigiaReclamoNominaDto,
  VigiaSetupPinDto,
  VigiaSosDto,
  VigiaStartTurnoDto,
} from './dto/vigia.dto';
import { VigiaConsigna } from './entities/vigia-consigna.entity';
import {
  VigiaDotacionFirma,
  VigiaNomina,
  VigiaNominaReclamo,
} from './entities/vigia-misc.entity';
import { VigiaMinuta } from './entities/vigia-minuta.entity';
import { VigiaPin } from './entities/vigia-pin.entity';
import { VigiaSos } from './entities/vigia-sos.entity';
import { VigiaTurno } from './entities/vigia-turno.entity';
import { VigiaJwtPayload } from './vigia-jwt-payload';
import * as bcrypt from 'bcrypt';

@Injectable()
export class VigiaService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(Associate)
    private readonly associates: Repository<Associate>,
    @InjectRepository(Post) private readonly posts: Repository<Post>,
    @InjectRepository(VigiaTurno) private readonly turnos: Repository<VigiaTurno>,
    @InjectRepository(VigiaSos) private readonly sosRepo: Repository<VigiaSos>,
    @InjectRepository(VigiaConsigna)
    private readonly consignasRepo: Repository<VigiaConsigna>,
    @InjectRepository(VigiaMinuta)
    private readonly minutas: Repository<VigiaMinuta>,
    @InjectRepository(VigiaNomina)
    private readonly nominaRepo: Repository<VigiaNomina>,
    @InjectRepository(VigiaNominaReclamo)
    private readonly reclamos: Repository<VigiaNominaReclamo>,
    @InjectRepository(VigiaDotacionFirma)
    private readonly firmas: Repository<VigiaDotacionFirma>,
    @InjectRepository(Delivery)
    private readonly deliveries: Repository<Delivery>,
    @InjectRepository(VigiaPin)
    private readonly pins: Repository<VigiaPin>,
  ) {}

  private readonly maxPinAttempts = 5;
  private readonly lockMinutes = 15;

  private fullName(a: Associate): string {
    return [a.firstName, a.secondName, a.firstLastName, a.secondLastName]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private employeeDto(a: Associate) {
    return {
      id: a.id,
      cedula: a.documentNumber.replace(/\D/g, '') || a.documentNumber,
      primer_nombre: a.firstName,
      nombre_completo: this.fullName(a),
      cargo: a.jobPosition?.name || 'Vigilante',
      estado: a.status,
      telefono: a.mobile,
    };
  }

  private assertPinFormat(pin: string): string {
    const p = pin.replace(/\D/g, '');
    if (!/^\d{4}$/.test(p)) {
      throw new BadRequestException('El PIN debe ser exactamente 4 dígitos');
    }
    return p;
  }

  private assertPinStrong(pin: string): string {
    const p = this.assertPinFormat(pin);
    if (/^(\d)\1{3}$/.test(p)) {
      throw new BadRequestException(
        'PIN demasiado débil: no uses 4 dígitos iguales (ej. 1111)',
      );
    }
    return p;
  }

  /** Busca asociado ACTIVO por cédula normalizada (ignora puntos/guiones en BD). */
  private async findActiveByCedula(cedula: string): Promise<Associate | null> {
    const rows = await this.associates.query(
      `
      SELECT id FROM associates
      WHERE status = $2
        AND regexp_replace(document_number, '[^0-9]', '', 'g') = $1
      LIMIT 1
      `,
      [cedula, AssociateStatus.ACTIVO],
    );
    const id = rows?.[0]?.id as string | undefined;
    if (!id) return null;
    return this.associates.findOne({
      where: { id },
      relations: { jobPosition: true },
    });
  }

  private async findActiveByCedulaAndNombre(
    cedula: string,
    nombre: string,
  ): Promise<Associate | null> {
    const associate = await this.findActiveByCedula(cedula);
    if (!associate) return null;
    const expected = nombre.trim().toLowerCase();
    const actual = (associate.firstName || '').trim().toLowerCase();
    if (actual !== expected) return null;
    return associate;
  }

  private assertNotLocked(cred: VigiaPin): void {
    if (cred.lockedUntil && cred.lockedUntil.getTime() > Date.now()) {
      const mins = Math.max(
        1,
        Math.ceil((cred.lockedUntil.getTime() - Date.now()) / 60000),
      );
      throw new UnauthorizedException(
        `PIN bloqueado por intentos fallidos. Espera ${mins} min o restablece el PIN.`,
      );
    }
  }

  private async registerPinFailure(cred: VigiaPin): Promise<never> {
    cred.failedAttempts = (cred.failedAttempts || 0) + 1;
    if (cred.failedAttempts >= this.maxPinAttempts) {
      cred.lockedUntil = new Date(Date.now() + this.lockMinutes * 60_000);
      cred.failedAttempts = 0;
      await this.pins.save(cred);
      throw new UnauthorizedException(
        `PIN bloqueado ${this.lockMinutes} minutos por demasiados intentos. Usa “Olvidé mi PIN”.`,
      );
    }
    await this.pins.save(cred);
    const left = this.maxPinAttempts - cred.failedAttempts;
    throw new UnauthorizedException(
      `PIN incorrecto. Te quedan ${left} intento(s).`,
    );
  }

  private async clearPinFailures(cred: VigiaPin): Promise<void> {
    if (cred.failedAttempts || cred.lockedUntil) {
      cred.failedAttempts = 0;
      cred.lockedUntil = null;
      await this.pins.save(cred);
    }
  }

  private async savePinHash(associateId: string, pin: string): Promise<void> {
    const hash = await bcrypt.hash(pin, 12);
    const existing = await this.pins.findOne({ where: { associateId } });
    if (existing) {
      existing.pinHash = hash;
      existing.failedAttempts = 0;
      existing.lockedUntil = null;
      await this.pins.save(existing);
      return;
    }
    await this.pins.save(
      this.pins.create({
        associateId,
        pinHash: hash,
        failedAttempts: 0,
        lockedUntil: null,
      }),
    );
  }

  async setupPin(dto: VigiaSetupPinDto) {
    const cedula = dto.cedula.replace(/\D/g, '');
    const nombre = dto.nombre.trim();
    const pin = this.assertPinStrong(dto.pin);
    if (cedula.length < 4 || nombre.length < 2) {
      throw new BadRequestException('Cédula (≥4) y nombre (≥2) son obligatorios');
    }

    const associate = await this.findActiveByCedulaAndNombre(cedula, nombre);
    if (!associate) {
      throw new UnauthorizedException(
        'Vigilante no encontrado o inactivo. Verifica cédula y primer nombre.',
      );
    }

    const existing = await this.pins.findOne({ where: { associateId: associate.id } });
    if (existing) {
      throw new BadRequestException(
        'Este vigilante ya tiene PIN. Ingresa con cédula y PIN, o usa “Olvidé mi PIN”.',
      );
    }

    await this.savePinHash(associate.id, pin);
    return this.openSession(associate);
  }

  async resetPin(dto: VigiaSetupPinDto) {
    const cedula = dto.cedula.replace(/\D/g, '');
    const nombre = dto.nombre.trim();
    const pin = this.assertPinStrong(dto.pin);
    if (cedula.length < 4 || nombre.length < 2) {
      throw new BadRequestException('Cédula (≥4) y nombre (≥2) son obligatorios');
    }

    const associate = await this.findActiveByCedulaAndNombre(cedula, nombre);
    if (!associate) {
      throw new UnauthorizedException(
        'No se pudo verificar identidad. Cédula y primer nombre deben coincidir.',
      );
    }

    await this.savePinHash(associate.id, pin);
    return this.openSession(associate);
  }

  async login(dto: VigiaLoginDto) {
    const cedula = dto.cedula.replace(/\D/g, '');
    const pin = this.assertPinFormat(dto.pin);
    if (cedula.length < 4) {
      throw new BadRequestException('Cédula (≥4) es obligatoria');
    }

    const associate = await this.findActiveByCedula(cedula);
    if (!associate) {
      throw new UnauthorizedException(
        'Vigilante no encontrado o inactivo. Verifica cédula.',
      );
    }

    const cred = await this.pins.findOne({ where: { associateId: associate.id } });
    const defaultLast4 = cedula.slice(-4);

    if (!cred) {
      if (pin === defaultLast4) {
        return this.openSession(associate);
      }
      throw new UnauthorizedException(
        `Para ingresar por primera vez, tu PIN son los últimos 4 dígitos de tu cédula (${defaultLast4}).`,
      );
    }

    this.assertNotLocked(cred);

    const ok = await bcrypt.compare(pin, cred.pinHash);
    if (!ok && pin !== defaultLast4) {
      await this.registerPinFailure(cred);
    }

    await this.clearPinFailures(cred);
    return this.openSession(associate);
  }

  private async openSession(associate: Associate) {
    const posts = await this.listPuestos();
    if (!posts.length) {
      throw new BadRequestException(
        'No hay puestos activos. Un administrador debe crear al menos un puesto en Operaciones.',
      );
    }

    let turno = await this.turnos.findOne({
      where: { associateId: associate.id, estado: 'ABIERTO' },
      order: { startedAt: 'DESC' },
      relations: { post: true },
    });

    if (!turno) {
      const post = posts[0];
      turno = await this.turnos.save(
        this.turnos.create({
          associateId: associate.id,
          postId: post.id,
          startedAt: new Date(),
          estado: 'ABIERTO',
        }),
      );
      turno = await this.turnos.findOne({
        where: { id: turno.id },
        relations: { post: true },
      });
    }

    if (!turno) {
      throw new BadRequestException('No se pudo abrir el turno');
    }

    const postName =
      turno.post?.name ||
      posts.find((p) => p.id === turno!.postId)?.name ||
      'Puesto';

    const payload: VigiaJwtPayload = {
      sub: associate.id,
      cedula: associate.documentNumber.replace(/\D/g, '') || associate.documentNumber,
      nombre: associate.firstName,
      aud: 'vigia',
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: '12h',
    });

    return {
      success: true,
      accessToken,
      empleado: this.employeeDto(associate),
      puesto_id: turno.postId,
      puesto_nombre: postName,
      turno_id: turno.id,
      inicio_timestamp: new Date(turno.startedAt).getTime(),
    };
  }

  listPuestos() {
    return this.posts.find({
      where: { status: PostStatus.ACTIVO },
      order: { code: 'ASC' },
      take: 100,
    });
  }

  async startTurno(associateId: string, dto: VigiaStartTurnoDto) {
    const posts = await this.listPuestos();
    const post =
      (dto.postId ? posts.find((p) => p.id === dto.postId) : null) || posts[0];
    if (!post) throw new BadRequestException('Sin puestos activos');

    const open = await this.turnos.findOne({
      where: { associateId, estado: 'ABIERTO' },
    });
    if (open) return this.getTurno(open.id);

    const turno = await this.turnos.save(
      this.turnos.create({
        associateId,
        postId: post.id,
        startedAt: new Date(),
        estado: 'ABIERTO',
      }),
    );
    return this.getTurno(turno.id);
  }

  async getTurno(id: string) {
    const t = await this.turnos.findOne({
      where: { id },
      relations: { post: true },
    });
    if (!t) throw new NotFoundException('Turno no encontrado');
    return t;
  }

  async cerrarTurno(associateId: string, turnoId: string, dto: VigiaCierreTurnoDto) {
    const t = await this.getTurno(turnoId);
    if (t.associateId !== associateId) {
      throw new UnauthorizedException('Turno de otro vigilante');
    }
    if (t.estado === 'CERRADO') {
      throw new BadRequestException('El turno ya está cerrado');
    }
    t.estado = 'CERRADO';
    t.closedAt = new Date();
    t.relevoNombre = dto.relevoNombre.trim();
    t.relevoFotoBase64 = dto.relevoFotoBase64 || null;
    await this.turnos.save(t);
    return t;
  }

  async sos(associateId: string, dto: VigiaSosDto) {
    return this.sosRepo.save(
      this.sosRepo.create({
        associateId,
        turnoId: dto.turnoId ?? null,
        postId: dto.postId ?? null,
        lat: dto.lat ?? null,
        lng: dto.lng ?? null,
        motivo: dto.motivo?.trim() || 'Pánico manual',
      }),
    );
  }

  listConsignas(postId: string) {
    return this.consignasRepo.find({
      where: { postId, activo: true },
      order: { sortOrder: 'ASC' },
    });
  }

  async seedConsignasIfEmpty(postId: string) {
    const n = await this.consignasRepo.count({ where: { postId } });
    if (n > 0) return;
    await this.consignasRepo.save([
      this.consignasRepo.create({
        postId,
        tipo: 'CONTACTS',
        titulo: 'Centro de control',
        detalle: 'Línea principal de monitoreo',
        telefono: '6040000000',
        sortOrder: 1,
      }),
      this.consignasRepo.create({
        postId,
        tipo: 'CONTACTS',
        titulo: 'Supervisor de zona',
        detalle: 'Contacto operativo',
        telefono: '3000000000',
        sortOrder: 2,
      }),
      this.consignasRepo.create({
        postId,
        tipo: 'RULES',
        titulo: 'Ronda perimetral',
        detalle: 'Realizar ronda cada hora y reportar novedades.',
        sortOrder: 1,
      }),
      this.consignasRepo.create({
        postId,
        tipo: 'RULES',
        titulo: 'Control de acceso',
        detalle: 'Registrar visitantes y contratistas en bitácora.',
        sortOrder: 2,
      }),
    ]);
  }

  async dotacion(associateId: string) {
    const last = await this.deliveries.find({
      where: { associateId },
      relations: { details: { variant: { item: true } } },
      order: { createdAt: 'DESC' },
      take: 5,
    });
    const items: Array<{ nombre: string; estado: string }> = [];
    for (const d of last) {
      for (const det of d.details || []) {
        items.push({
          nombre: det.variant?.item?.name || 'Elemento',
          estado: 'BUENO',
        });
      }
    }
    if (!items.length) {
      return [
        { nombre: 'Uniforme de servicio', estado: 'BUENO' },
        { nombre: 'Botas de seguridad', estado: 'BUENO' },
      ];
    }
    return items;
  }

  firmarDotacion(associateId: string, dto: VigiaFirmarDotacionDto) {
    return this.firmas.save(
      this.firmas.create({
        associateId,
        items: dto.items.trim(),
        firmaBase64: dto.firmaBase64,
      }),
    );
  }

  async solicitarDotacion(
    associateId: string,
    body: { motivo: string; fotoBase64: string; postId?: string; turnoId?: string },
  ) {
    if (!body.fotoBase64?.trim()) {
      throw new BadRequestException('La foto del daño es obligatoria');
    }
    const posts = await this.listPuestos();
    const postId = body.postId || posts[0]?.id;
    if (!postId) throw new BadRequestException('Sin puesto');
    return this.minutas.save(
      this.minutas.create({
        tipo: 'SOLICITUD_DOTACION',
        postId,
        associateId,
        turnoId: body.turnoId ?? null,
        payload: {
          motivo: body.motivo,
          fotoBase64: body.fotoBase64,
        },
        entradaAt: new Date(),
      }),
    );
  }

  listNomina(associateId: string) {
    return this.nominaRepo.find({
      where: { associateId },
      order: { createdAt: 'DESC' },
      take: 24,
    });
  }

  async ensureNominaSample(associateId: string) {
    const n = await this.nominaRepo.count({ where: { associateId } });
    if (n > 0) return;
    const month = new Date().toLocaleString('es-CO', {
      month: 'long',
      year: 'numeric',
    });
    await this.nominaRepo.save(
      this.nominaRepo.create({
        associateId,
        periodo: month.toUpperCase(),
        horasOrdinarias: '192',
        horasExtra: '8',
        recargoNocturno: '48',
        recargoFestivo: '0',
        neto: '1850000',
      }),
    );
  }

  reclamarNomina(associateId: string, dto: VigiaReclamoNominaDto) {
    return this.reclamos.save(
      this.reclamos.create({
        associateId,
        periodo: dto.periodo.trim(),
        motivo: dto.motivo.trim(),
        detalle: dto.detalle.trim(),
      }),
    );
  }

  createMinuta(associateId: string, dto: VigiaCreateMinutaDto) {
    return this.minutas.save(
      this.minutas.create({
        tipo: dto.tipo,
        postId: dto.postId,
        nombrePuesto: dto.nombrePuesto ?? null,
        associateId,
        turnoId: dto.turnoId ?? null,
        payload: dto.payload ?? {},
        entradaAt: new Date(),
      }),
    );
  }

  async salidaMinuta(id: string, associateId: string) {
    const m = await this.minutas.findOne({ where: { id } });
    if (!m) throw new NotFoundException('Minuta no encontrada');
    if (m.associateId && m.associateId !== associateId) {
      throw new UnauthorizedException();
    }
    m.salidaAt = new Date();
    return this.minutas.save(m);
  }

  listMinutas(postId: string) {
    return this.minutas.find({
      where: { postId },
      order: { entradaAt: 'DESC' },
      take: 50,
    });
  }

  /** Calendario simple del mes (sin programación detallada = LIBRE). */
  turneroMes(year: number, month: number) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const dow = date.getDay();
      const festivo = dow === 0;
      days.push({
        dia: d,
        fecha: date.toISOString().slice(0, 10),
        estado: festivo ? 'FESTIVO' : dow === 6 ? 'LIBRE' : d % 2 === 0 ? 'NOCHE' : 'MAÑANA',
        horario: festivo || dow === 6 ? null : d % 2 === 0 ? '18:00 - 06:00' : '06:00 - 18:00',
      });
    }
    return { year, month, days };
  }
}
