import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RolePermission } from '../../roles/entities/role-permission.entity';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 100 })
  code!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ length: 50 })
  module!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @OneToMany(() => RolePermission, (rp) => rp.permission)
  rolePermissions!: RolePermission[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
