import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SstWorkplace } from './sst-workplace.entity';

@Entity('sst_clients')
export class SstClient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'text' })
  nombre!: string;

  @Column({ type: 'text', nullable: true })
  nit!: string | null;

  @Column({ type: 'text', nullable: true })
  contacto!: string | null;

  @Column({ type: 'text', nullable: true })
  telefono!: string | null;

  @OneToMany(() => SstWorkplace, (w) => w.client)
  workplaces!: SstWorkplace[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
