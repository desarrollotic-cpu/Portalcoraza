import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Post } from '../../posts/entities/post.entity';
import { PostEquipmentCatalog } from './post-equipment-catalog.entity';

export enum PostEquipmentUnitStatus {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  LOST = 'LOST',
  WRITTEN_OFF = 'WRITTEN_OFF',
}

@Entity('post_equipment_units')
export class PostEquipmentUnit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'catalog_id', type: 'uuid' })
  catalogId!: string;

  @ManyToOne(() => PostEquipmentCatalog, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'catalog_id' })
  catalog!: PostEquipmentCatalog;

  @Column({ name: 'unit_code', type: 'varchar', length: 50 })
  unitCode!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  label!: string | null;

  @Column({ name: 'serial_or_tag', type: 'varchar', length: 100, nullable: true })
  serialOrTag!: string | null;

  @Column({
    type: 'enum',
    enum: PostEquipmentUnitStatus,
    enumName: 'post_equipment_unit_status',
    default: PostEquipmentUnitStatus.AVAILABLE,
  })
  status!: PostEquipmentUnitStatus;

  @Column({ name: 'current_post_id', type: 'uuid', nullable: true })
  currentPostId!: string | null;

  @ManyToOne(() => Post, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'current_post_id' })
  currentPost!: Post | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
