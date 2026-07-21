import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InventoryItem } from './inventory-item.entity';

@Entity('inventory_variants')
export class InventoryVariant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId!: string;

  @ManyToOne(() => InventoryItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item!: InventoryItem;

  @Column({ unique: true, length: 100 })
  sku!: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  attributes!: Record<string, unknown>;

  @Column({ type: 'varchar', length: 40, nullable: true })
  talla!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  color!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  genero!: string | null;

  @Column({ name: 'stock_current', type: 'int', default: 0 })
  stockCurrent!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
