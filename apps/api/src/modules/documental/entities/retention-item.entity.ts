import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('doc_retention_table')
export class RetentionItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'dependency_code', type: 'varchar', length: 10 })
  dependencyCode!: string;

  @Column({ name: 'dependency_name', type: 'varchar', length: 120 })
  dependencyName!: string;

  @Column({ name: 'series_code', type: 'varchar', length: 10 })
  seriesCode!: string;

  @Column({ name: 'series_name', type: 'varchar', length: 120 })
  seriesName!: string;

  @Column({ name: 'subseries_code', type: 'varchar', length: 10, nullable: true })
  subseriesCode!: string | null;

  @Column({ name: 'subseries_name', type: 'varchar', length: 120, nullable: true })
  subseriesName!: string | null;

  @Column({ name: 'management_years', type: 'int', nullable: true })
  managementYears!: number | null;

  @Column({ name: 'central_years', type: 'int', nullable: true })
  centralYears!: number | null;

  @Column({ name: 'final_disposition', type: 'varchar', length: 120, nullable: true })
  finalDisposition!: string | null;

  @Column({ name: 'legal_basis', type: 'text', nullable: true })
  legalBasis!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
