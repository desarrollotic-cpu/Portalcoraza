import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('sig_sistemas')
export class SigSistema {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true })
  nombre!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('sig_objetivos')
export class SigObjetivo {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'sistema_id', type: 'uuid' })
  sistemaId!: string;

  @Column({ type: 'text' })
  perspectiva!: string;

  @Column({ name: 'objetivo_texto', type: 'text' })
  objetivoTexto!: string;

  @Column({ type: 'text', nullable: true })
  estrategia!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('sig_indicadores')
export class SigIndicador {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text', unique: true })
  codigo!: string;

  @Column({ type: 'text' })
  nombre!: string;

  @Column({ name: 'objetivo_id', type: 'uuid' })
  objetivoId!: string;

  @Column({ type: 'text' })
  subsistema!: string;

  @Column({ type: 'text', nullable: true })
  proposito!: string | null;

  @Column({ type: 'text', nullable: true })
  formula!: string | null;

  @Column({ type: 'text' })
  frecuencia!: string;

  @Column({ type: 'text' })
  sentido!: string;

  @Column({ type: 'text' })
  area!: string;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @Column({ type: 'text', nullable: true })
  responsable!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('sig_resultados')
export class SigResultado {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'indicador_id', type: 'uuid' })
  indicadorId!: string;

  @Column({ type: 'int' })
  anio!: number;

  @Column({ type: 'text' })
  periodo!: string;

  @Column({ name: 'meta_snapshot', type: 'numeric' })
  metaSnapshot!: string;

  @Column({ name: 'valor_resultado', type: 'numeric' })
  valorResultado!: string;

  @Column({ type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({ name: 'color_semaforo', type: 'text' })
  colorSemaforo!: string;

  @Column({ type: 'text', default: 'ABIERTO' })
  seguimiento!: string;

  @Column({ name: 'capturado_por', type: 'text' })
  capturadoPor!: string;

  @Column({ name: 'fecha_captura', type: 'timestamptz' })
  fechaCaptura!: Date;
}
