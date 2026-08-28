import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sst_checklist_items')
export class SstChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'int' })
  codigo!: number;

  @Column({ type: 'text' })
  categoria!: string;

  @Column({ type: 'text' })
  pregunta!: string;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;
}
