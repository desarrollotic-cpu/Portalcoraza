import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { WorkCenter } from '../hr-work-centers/entities/work-center.entity';
import { CreatePostDto } from './dto/create-post.dto';
import {
  PostContractItemDto,
  PostOtrosiItemDto,
} from './dto/post-agreements.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostContract } from './entities/post-contract.entity';
import { PostOtrosi } from './entities/post-otrosi.entity';
import { Post, PostStatus, PostType } from './entities/post.entity';
import { blank, contractEmpty, otrosiEmpty } from './post-agreements.util';

function splitAgreements(dto: CreatePostDto | UpdatePostDto) {
  const { contracts, otrosi, ...rest } = dto;
  return { contracts, otrosi, rest };
}

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepo: Repository<Post>,
    @InjectRepository(PostContract)
    private readonly contractsRepo: Repository<PostContract>,
    @InjectRepository(PostOtrosi)
    private readonly otrosiRepo: Repository<PostOtrosi>,
    private readonly auditService: AuditService,
  ) {}

  async findAll() {
    const rows = await this.postsRepo.find({
      relations: { contracts: true, otrosi: true },
    });
    return rows.sort((a, b) => {
      const za = Number(String(a.zone ?? '').match(/\d+/)?.[0] ?? -1);
      const zb = Number(String(b.zone ?? '').match(/\d+/)?.[0] ?? -1);
      if (zb !== za) return zb - za;
      return a.name.localeCompare(b.name, 'es');
    }).map((row) => this.withAgreements(row));
  }

  /** Conteo canónico del catálogo operativo (misma base que Operaciones → Puestos). */
  async countSummary() {
    const total = await this.postsRepo.count();
    const active = await this.postsRepo.count({
      where: { status: PostStatus.ACTIVO },
    });
    return { total, active, inactive: total - active };
  }

  /**
   * Mantiene el puesto de Programación alineado con un centro de trabajo RRHH.
   * Si no existe, lo crea; si existe (por work_center_id o código), lo actualiza.
   */
  async syncFromWorkCenter(wc: WorkCenter, userId?: string): Promise<Post> {
    const name = (wc.clientName?.trim() || wc.code).slice(0, 200);
    const status = wc.isActive ? PostStatus.ACTIVO : PostStatus.INACTIVO;

    let post =
      (await this.postsRepo.findOne({ where: { workCenterId: wc.id } })) ??
      (await this.postsRepo.findOne({ where: { code: wc.code } }));

    if (!post) {
      post = this.postsRepo.create({
        code: wc.code.slice(0, 50),
        name,
        type: PostType.SERVICIO_ESPECIAL,
        status,
        address: wc.address,
        clientName: wc.clientName,
        notes: wc.notes,
        workCenterId: wc.id,
      });
      const saved = await this.postsRepo.save(post);
      if (userId) {
        await this.auditService.log({
          userId,
          module: 'posts',
          action: 'create',
          entityType: 'post',
          entityId: saved.id,
          newValue: {
            ...saved,
            syncedFrom: 'work_center',
          } as unknown as Record<string, unknown>,
        });
      }
      return saved;
    }

    const oldSnapshot = { ...post };
    post.code = wc.code.slice(0, 50);
    post.name = name;
    post.status = status;
    post.address = wc.address;
    post.clientName = wc.clientName;
    post.notes = wc.notes;
    post.workCenterId = wc.id;
    const saved = await this.postsRepo.save(post);

    if (userId) {
      await this.auditService.log({
        userId,
        module: 'posts',
        action: 'update',
        entityType: 'post',
        entityId: saved.id,
        oldValue: oldSnapshot as unknown as Record<string, unknown>,
        newValue: {
          ...saved,
          syncedFrom: 'work_center',
        } as unknown as Record<string, unknown>,
      });
    }

    return saved;
  }

  async findOne(id: string) {
    const post = await this.postsRepo.findOne({
      where: { id },
      relations: { contracts: true, otrosi: true },
    });
    if (!post) {
      throw new NotFoundException('Puesto no encontrado');
    }
    return this.withAgreements(post);
  }

  async create(dto: CreatePostDto, userId: string) {
    const { contracts, otrosi, rest } = splitAgreements(dto);
    const code = dto.code.trim();
    const existing = await this.postsRepo.findOne({ where: { code } });
    if (existing) {
      throw new ConflictException(`Ya existe un puesto con código ${code}`);
    }

    const post = this.postsRepo.create({
      ...rest,
      code,
      name: dto.name.trim(),
    });
    this.applyLastContract(post, contracts);
    const saved = await this.postsRepo.save(post);
    await this.replaceAgreements(saved.id, contracts, otrosi);

    await this.auditService.log({
      userId,
      module: 'posts',
      action: 'create',
      entityType: 'post',
      entityId: saved.id,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return this.findOne(saved.id);
  }

  async update(id: string, dto: UpdatePostDto, userId: string) {
    const { contracts, otrosi, rest } = splitAgreements(dto);
    const existing = await this.postsRepo.findOne({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Puesto no encontrado');
    }
    if (rest.code && rest.code.trim() !== existing.code) {
      const clash = await this.postsRepo.findOne({
        where: { code: rest.code.trim() },
      });
      if (clash && clash.id !== id) {
        throw new ConflictException(`Ya existe un puesto con código ${rest.code.trim()}`);
      }
    }

    const oldSnapshot = { ...existing };
    Object.assign(existing, {
      ...rest,
      ...(rest.code !== undefined ? { code: rest.code.trim() } : {}),
      ...(rest.name !== undefined ? { name: rest.name.trim() } : {}),
    });
    this.applyLastContract(existing, contracts);
    const saved = await this.postsRepo.save(existing);
    if (contracts !== undefined || otrosi !== undefined) {
      await this.replaceAgreements(id, contracts, otrosi);
    }

    await this.auditService.log({
      userId,
      module: 'posts',
      action: 'update',
      entityType: 'post',
      entityId: id,
      oldValue: oldSnapshot as unknown as Record<string, unknown>,
      newValue: saved as unknown as Record<string, unknown>,
    });

    return this.findOne(id);
  }

  private withAgreements(post: Post) {
    const contracts = [...(post.contracts ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    const otrosi = [...(post.otrosi ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    return { ...post, contracts, otrosi };
  }

  private applyLastContract(post: Post, contracts?: PostContractItemDto[]) {
    if (!contracts) return;
    const last = [...contracts].reverse().find((c) => !contractEmpty(c));
    if (!last) return;
    post.contractNumber = blank(last.contractNumber);
    post.contractStart = blank(last.contractStart);
    post.contractTerm = blank(last.contractTerm);
    post.contractEnd = blank(last.contractEnd);
    post.serviceType = blank(last.serviceType);
    post.armed = !!last.armed;
    post.basc =
      last.basc === 'SI' ? true : last.basc === 'NO_APLICA' ? false : post.basc;
  }

  private async replaceAgreements(
    postId: string,
    contracts?: PostContractItemDto[],
    otrosi?: PostOtrosiItemDto[],
  ) {
    if (contracts !== undefined) {
      await this.contractsRepo.delete({ postId });
      const rows = contracts.filter((c) => !contractEmpty(c)).map((c, i) =>
        this.contractsRepo.create({
          postId,
          sortOrder: i,
          contractNumber: blank(c.contractNumber),
          contractStart: blank(c.contractStart),
          contractTerm: blank(c.contractTerm),
          contractEnd: blank(c.contractEnd),
          basc: blank(c.basc),
          serviceType: blank(c.serviceType),
          invoiceValue: blank(c.invoiceValue),
          armed: !!c.armed,
        }),
      );
      if (rows.length) await this.contractsRepo.save(rows);
    }
    if (otrosi !== undefined) {
      await this.otrosiRepo.delete({ postId });
      const rows = otrosi.filter((o) => !otrosiEmpty(o)).map((o, i) =>
        this.otrosiRepo.create({
          postId,
          sortOrder: i,
          number: blank(o.number),
          typeText: blank(o.typeText),
          dateText: blank(o.dateText),
          invoiceValue: blank(o.invoiceValue),
          serviceType: blank(o.serviceType),
        }),
      );
      if (rows.length) await this.otrosiRepo.save(rows);
    }
  }
}
