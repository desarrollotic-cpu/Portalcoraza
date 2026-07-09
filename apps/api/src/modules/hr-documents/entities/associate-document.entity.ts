import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Associate } from '../../associates/entities/associate.entity';

export enum AssociateDocumentKind {
  CEDULA = 'CEDULA',
  CERTIFICADO_CURSO = 'CERTIFICADO_CURSO',
  EXAMEN_PSICOFISICO = 'EXAMEN_PSICOFISICO',
  EXAMEN_PSICOSENSOMETRICO = 'EXAMEN_PSICOSENSOMETRICO',
  POLIZA_SURA = 'POLIZA_SURA',
  CONTRATO = 'CONTRATO',
  ACTA = 'ACTA',
  OTRO = 'OTRO',
}

@Entity('associate_documents')
@Index('idx_associate_documents_associate', ['associateId', 'uploadedAt'])
@Index('idx_associate_documents_kind', ['associateId', 'documentKind'])
export class AssociateDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'associate_id', type: 'uuid' })
  associateId!: string;

  @ManyToOne(() => Associate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'associate_id' })
  associate!: Associate;

  @Column({
    name: 'document_kind',
    type: 'enum',
    enum: AssociateDocumentKind,
    enumName: 'associate_document_kind',
  })
  documentKind!: AssociateDocumentKind;

  @Column({ name: 'file_url', type: 'text' })
  fileUrl!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  fileName!: string | null;

  @Column({ name: 'file_size', type: 'integer', nullable: true })
  fileSize!: number | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 120, nullable: true })
  mimeType!: string | null;

  @Column({ name: 'expiration_date', type: 'date', nullable: true })
  expirationDate!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy!: string | null;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt!: Date;
}
