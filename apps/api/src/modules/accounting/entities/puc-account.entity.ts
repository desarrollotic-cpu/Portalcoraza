import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('puc_accounts')
export class PucAccount {
  @PrimaryColumn({ length: 10 })
  code!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ type: 'varchar', length: 20 })
  type!: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO' | 'COSTO';

  @Column({ type: 'int' })
  level!: number;

  @Column({ name: 'allows_movement', default: true })
  allowsMovement!: boolean;

  // type explícito: string|null se refleja como Object y TypeORM falla en Postgres
  @Column({ name: 'parent_code', type: 'varchar', length: 10, nullable: true })
  parentCode!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
