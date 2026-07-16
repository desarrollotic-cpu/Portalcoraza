import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('post_equipment_catalog')
export class PostEquipmentCatalog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  brand!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  model!: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  category!: string | null;

  @Column({ type: 'varchar', length: 60, nullable: true })
  color!: string | null;

  @Column({
    name: 'approximate_value',
    type: 'numeric',
    precision: 14,
    scale: 2,
    nullable: true,
    transformer: {
      to: (v?: number | null) => v,
      from: (v: string | null) => (v == null ? null : Number(v)),
    },
  })
  approximateValue!: number | null;

  @Column({ type: 'text', nullable: true })
  specs!: string | null;

  @Column({ name: 'requires_return', type: 'boolean', default: true })
  requiresReturn!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
