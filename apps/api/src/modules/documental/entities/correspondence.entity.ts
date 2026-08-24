import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('doc_correspondence')
export class Correspondence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'document_code', type: 'varchar', length: 60, unique: true, nullable: true })
  documentCode!: string | null;

  @Column({ name: 'numeric_code', type: 'int', nullable: true })
  numericCode!: number | null;

  @Column({ name: 'document_date', type: 'date', nullable: true })
  documentDate!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  medium!: string | null;

  @Column({ name: 'document_type', type: 'varchar', length: 120, nullable: true })
  documentType!: string | null;

  @Column({ name: 'origin_dept', type: 'varchar', length: 10 })
  originDept!: string;

  @Column({ name: 'destination_dept', type: 'varchar', length: 10, nullable: true })
  destinationDept!: string | null;

  @Column({ type: 'text', nullable: true })
  subject!: string | null;

  @Column({ type: 'text', nullable: true })
  detail!: string | null;

  @Column({ type: 'varchar', length: 30, default: 'PENDIENTE' })
  status!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  voxelsera!: string | null;

  @Column({ name: 'registered_by', type: 'uuid', nullable: true })
  registeredBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
