import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentType } from './document-type.entity';

@Entity('document_records')
export class DocumentRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code!: string;

  @Column({ name: 'document_type_id', type: 'uuid' })
  documentTypeId!: string;

  @ManyToOne(() => DocumentType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'document_type_id' })
  documentType!: DocumentType;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ name: 'physical_location', type: 'text', nullable: true })
  physicalLocation!: string | null;

  @Column({ type: 'text', nullable: true })
  observations!: string | null;

  @Column({ name: 'registered_at', type: 'date' })
  registeredAt!: string;

  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl!: string | null;

  @Column({ name: 'storage_provider', type: 'varchar', length: 40, nullable: true })
  storageProvider!: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
