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
import { User } from '../../users/entities/user.entity';
import { PostEquipmentCatalog } from './post-equipment-catalog.entity';
import { PostEquipmentUnit } from './post-equipment-unit.entity';

export enum PostEquipmentStatus {
  ASSIGNED = 'ASSIGNED',
  RETURNED = 'RETURNED',
  LOST = 'LOST',
  WRITTEN_OFF = 'WRITTEN_OFF',
}

@Entity('post_equipment_assignments')
export class PostEquipmentAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'post_id', type: 'uuid' })
  postId!: string;

  @ManyToOne(() => Post, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'post_id' })
  post!: Post;

  @Column({ name: 'catalog_id', type: 'uuid', nullable: true })
  catalogId!: string | null;

  @ManyToOne(() => PostEquipmentCatalog, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'catalog_id' })
  catalog!: PostEquipmentCatalog | null;

  @Column({ name: 'unit_id', type: 'uuid', nullable: true })
  unitId!: string | null;

  @ManyToOne(() => PostEquipmentUnit, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'unit_id' })
  unit!: PostEquipmentUnit | null;

  @Column({ name: 'custom_name', type: 'varchar', length: 200, nullable: true })
  customName!: string | null;

  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Column({ name: 'serial_or_tag', type: 'varchar', length: 100, nullable: true })
  serialOrTag!: string | null;

  @Column({ name: 'condition_on_delivery', type: 'varchar', length: 40, nullable: true })
  conditionOnDelivery!: string | null;

  @Column({ name: 'delivered_at', type: 'timestamptz' })
  deliveredAt!: Date;

  @Column({ name: 'delivered_by', type: 'uuid', nullable: true })
  deliveredBy!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'delivered_by' })
  deliveredByUser!: User | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({
    type: 'enum',
    enum: PostEquipmentStatus,
    enumName: 'post_equipment_status',
    default: PostEquipmentStatus.ASSIGNED,
  })
  status!: PostEquipmentStatus;

  @Column({ name: 'returned_at', type: 'timestamptz', nullable: true })
  returnedAt!: Date | null;

  @Column({ name: 'returned_by', type: 'uuid', nullable: true })
  returnedBy!: string | null;

  @Column({ name: 'return_condition', type: 'varchar', length: 40, nullable: true })
  returnCondition!: string | null;

  @Column({ name: 'return_notes', type: 'text', nullable: true })
  returnNotes!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
