import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('vigia_pins')
export class VigiaPin {
  @PrimaryColumn({ name: 'associate_id', type: 'uuid' })
  associateId!: string;

  @Column({ name: 'pin_hash', type: 'text' })
  pinHash!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
