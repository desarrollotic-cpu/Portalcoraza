import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('doc_counters')
export class DocCounter {
  @PrimaryColumn({ type: 'varchar', length: 120 })
  scope!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'last_value', type: 'int', default: 0 })
  lastValue!: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
