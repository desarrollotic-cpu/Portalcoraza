import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('inventory_warehouses')
export class InventoryWarehouse {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ length: 20 })
  code!: string;

  @Column({ length: 80 })
  name!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
