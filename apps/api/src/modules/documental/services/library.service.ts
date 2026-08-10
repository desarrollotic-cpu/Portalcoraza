import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../../audit/audit.service';
import { CreateLibraryFileDto } from '../dto/create-library-file.dto';
import { CreateLibraryFolderDto } from '../dto/create-library-folder.dto';
import { LibraryFile } from '../entities/library-file.entity';
import { LibraryFolder } from '../entities/library-folder.entity';

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(LibraryFolder)
    private readonly foldersRepo: Repository<LibraryFolder>,
    @InjectRepository(LibraryFile)
    private readonly filesRepo: Repository<LibraryFile>,
    private readonly audit: AuditService,
  ) {}

  async tree() {
    const [folders, files] = await Promise.all([
      this.foldersRepo.find({ order: { name: 'ASC' } }),
      this.filesRepo.find({ where: { status: 'ACTIVO' }, order: { name: 'ASC' } }),
    ]);
    return { folders, files };
  }

  async createFolder(dto: CreateLibraryFolderDto, userId: string) {
    const saved = await this.foldersRepo.save(
      this.foldersRepo.create({
        name: dto.name,
        parentId: dto.parentId ?? null,
        color: dto.color ?? '#2563eb',
        isSystem: false,
      }),
    );
    await this.audit.log({
      userId,
      module: 'documental',
      action: 'library.folder.create',
      entityType: 'doc_library_folders',
      entityId: saved.id,
    });
    return saved;
  }

  async createFile(dto: CreateLibraryFileDto, userId: string) {
    const saved = await this.filesRepo.save(
      this.filesRepo.create({
        name: dto.name,
        category: dto.category ?? null,
        version: dto.version ?? '1.0',
        status: 'ACTIVO',
        url: dto.url ?? null,
        elaborationDate: dto.elaborationDate ?? null,
        changeDescription: dto.changeDescription ?? null,
        responsible: dto.responsible ?? null,
        folderId: dto.folderId ?? null,
        storageProvider: dto.storageProvider ?? null,
        registeredBy: userId,
      }),
    );
    await this.audit.log({
      userId,
      module: 'documental',
      action: 'library.file.create',
      entityType: 'doc_library_files',
      entityId: saved.id,
    });
    return saved;
  }

  /** Borrado lógico del archivo. */
  async deleteFile(id: string, userId: string) {
    const file = await this.filesRepo.findOne({ where: { id } });
    if (!file) {
      throw new NotFoundException('Documento no encontrado');
    }
    file.status = 'ELIMINADO';
    await this.filesRepo.save(file);
    await this.audit.log({
      userId,
      module: 'documental',
      action: 'library.file.delete',
      entityType: 'doc_library_files',
      entityId: id,
    });
    return { success: true };
  }

  /** Al borrar carpeta, sus archivos quedan sin carpeta (raíz) antes de eliminarla. */
  async deleteFolder(id: string, userId: string) {
    const folder = await this.foldersRepo.findOne({ where: { id } });
    if (!folder) {
      throw new NotFoundException('Carpeta no encontrada');
    }
    await this.filesRepo.update({ folderId: id }, { folderId: null });
    await this.foldersRepo.delete({ id });
    await this.audit.log({
      userId,
      module: 'documental',
      action: 'library.folder.delete',
      entityType: 'doc_library_folders',
      entityId: id,
    });
    return { success: true };
  }
}
