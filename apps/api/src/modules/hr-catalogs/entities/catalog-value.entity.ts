import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

export enum CatalogKind {
  EPS = 'EPS',
  FONDO_PENSION = 'FONDO_PENSION',
  RH = 'RH',
  GENERO = 'GENERO',
  ORIENTACION_SEXUAL = 'ORIENTACION_SEXUAL',
  RELIGION = 'RELIGION',
  RAZA = 'RAZA',
  MOTIVO_RETIRO = 'MOTIVO_RETIRO',
  RAZON_RETIRO = 'RAZON_RETIRO',
  MEDIO_TRANSPORTE = 'MEDIO_TRANSPORTE',
  TIEMPO_TRASLADO = 'TIEMPO_TRASLADO',
  TIPO_VIVIENDA = 'TIPO_VIVIENDA',
  NIVEL_ESTUDIO = 'NIVEL_ESTUDIO',
  RANGO_INGRESOS = 'RANGO_INGRESOS',
}

@Entity('catalog_values')
@Unique(['kind', 'value'])
@Index('idx_catalog_values_kind', ['kind'])
export class CatalogValue {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: CatalogKind,
    enumName: 'catalog_kind',
  })
  kind!: CatalogKind;

  @Column({ type: 'varchar', length: 120 })
  value!: string;

  @Column({ name: 'display_order', type: 'smallint', default: 0 })
  displayOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
