import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InventoryCategory } from './inventory-category.entity';

@Entity('inventory_items')
export class InventoryItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => InventoryCategory, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category!: InventoryCategory;

  @Column({ unique: true, length: 80 })
  code!: string;

  @Column({ length: 180 })
  name!: string;

  @Column({ length: 30 })
  unit!: string;

  @Column({ name: 'low_stock_threshold', type: 'int', default: 0 })
  lowStockThreshold!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
