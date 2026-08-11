import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('sst_checklist_items')
export class SstChecklistItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'int', unique: true })
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
