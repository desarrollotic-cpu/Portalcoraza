import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('doc_library_files')
export class LibraryFile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  category!: string | null;

  @Column({ type: 'varchar', length: 20, default: '1.0' })
  version!: string;

  @Column({ type: 'varchar', length: 30, default: 'ACTIVO' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  url!: string | null;

  @Column({ name: 'elaboration_date', type: 'date', nullable: true })
  elaborationDate!: string | null;

  @Column({ name: 'change_description', type: 'text', nullable: true })
  changeDescription!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  responsible!: string | null;

  @Column({ name: 'folder_id', type: 'uuid', nullable: true })
  folderId!: string | null;

  @Column({ name: 'storage_provider', type: 'varchar', length: 40, nullable: true })
  storageProvider!: string | null;

  @Column({ name: 'registered_by', type: 'uuid', nullable: true })
  registeredBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
