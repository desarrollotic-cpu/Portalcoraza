import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity('minuta_visitantes')
export class MinutaVisitante {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id!: string;

  @Column({ name: 'fecha_registro', type: 'timestamptz' })
  fechaRegistro!: Date;

  @Column({ name: 'associate_id', type: 'uuid', nullable: true })
  associateId!: string | null;

  @Column({ type: 'text' })
  usuario!: string;

  @Column({ name: 'nombre_completo', type: 'text' })
  nombreCompleto!: string;

  @Column({ type: 'text', nullable: true })
  cedula!: string | null;

  @Column({ name: 'apto_no', type: 'text' })
  aptoNo!: string;

  @Column({ type: 'text', default: 'No' })
  acompana!: string;

  @Column({ name: 'vehiculo_placa', type: 'text', nullable: true })
  vehiculoPlaca!: string | null;

  @Column({ name: 'hora_entrada', type: 'text' })
  horaEntrada!: string;

  @Column({ name: 'hora_salida', type: 'timestamptz', nullable: true })
  horaSalida!: Date | null;

  @Column({ type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({ type: 'text', default: 'ACTIVO' })
  estado!: string;

  @Column({ name: 'post_id', type: 'uuid', nullable: true })
  postId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('minuta_correspondencia')
export class MinutaCorrespondencia {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id!: string;

  @Column({ name: 'fecha_registro', type: 'timestamptz' })
  fechaRegistro!: Date;

  @Column({ name: 'associate_id', type: 'uuid', nullable: true })
  associateId!: string | null;

  @Column({ type: 'text' })
  usuario!: string;

  @Column({ type: 'text' })
  clase!: string;

  @Column({ name: 'apto_no', type: 'text' })
  aptoNo!: string;

  @Column({ type: 'text', default: 'Residente' })
  destinatario!: string;

  @Column({ type: 'text', nullable: true })
  remitente!: string | null;

  @Column({ name: 'vigilante_entrega', type: 'text', nullable: true })
  vigilanteEntrega!: string | null;

  @Column({ name: 'fecha_entrega', type: 'timestamptz', nullable: true })
  fechaEntrega!: Date | null;

  @Column({ name: 'recibido_por', type: 'text', nullable: true })
  recibidoPor!: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({ type: 'text', default: 'PENDIENTE' })
  estado!: string;

  @Column({ name: 'post_id', type: 'uuid', nullable: true })
  postId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('minuta_contratistas')
export class MinutaContratista {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id!: string;

  @Column({ name: 'fecha_registro', type: 'timestamptz' })
  fechaRegistro!: Date;

  @Column({ name: 'associate_id', type: 'uuid', nullable: true })
  associateId!: string | null;

  @Column({ type: 'text' })
  usuario!: string;

  @Column({ name: 'nombre_completo', type: 'text' })
  nombreCompleto!: string;

  @Column({ type: 'text' })
  cedula!: string;

  @Column({ type: 'text' })
  empresa!: string;

  @Column({ name: 'area_trabajo', type: 'text', nullable: true })
  areaTrabajo!: string | null;

  @Column({ name: 'hora_ingreso', type: 'text' })
  horaIngreso!: string;

  @Column({ name: 'hora_salida', type: 'timestamptz', nullable: true })
  horaSalida!: Date | null;

  @Column({ type: 'text', nullable: true })
  equipos!: string | null;

  @Column({ name: 'autorizado_por', type: 'text' })
  autorizadoPor!: string;

  @Column({ type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({ type: 'text', default: 'ACTIVO' })
  estado!: string;

  @Column({ name: 'post_id', type: 'uuid', nullable: true })
  postId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('minuta_domiciliarios')
export class MinutaDomiciliario {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id!: string;

  @Column({ name: 'fecha_registro', type: 'timestamptz' })
  fechaRegistro!: Date;

  @Column({ name: 'associate_id', type: 'uuid', nullable: true })
  associateId!: string | null;

  @Column({ type: 'text' })
  usuario!: string;

  @Column({ type: 'text' })
  empresa!: string;

  @Column({ name: 'tipo_pedido', type: 'text' })
  tipoPedido!: string;

  @Column({ name: 'apto_no', type: 'text' })
  aptoNo!: string;

  @Column({ name: 'nombre_domiciliario', type: 'text', nullable: true })
  nombreDomiciliario!: string | null;

  @Column({ name: 'placa_moto', type: 'text', nullable: true })
  placaMoto!: string | null;

  @Column({ name: 'hora_llegada', type: 'text' })
  horaLlegada!: string;

  @Column({ name: 'hora_salida', type: 'timestamptz', nullable: true })
  horaSalida!: Date | null;

  @Column({ name: 'codigo_pedido', type: 'text', nullable: true })
  codigoPedido!: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({ type: 'text', default: 'ENTREGANDO' })
  estado!: string;

  @Column({ name: 'post_id', type: 'uuid', nullable: true })
  postId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('minuta_incidentes')
export class MinutaIncidente {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id!: string;

  @Column({ name: 'fecha_registro', type: 'timestamptz' })
  fechaRegistro!: Date;

  @Column({ name: 'associate_id', type: 'uuid', nullable: true })
  associateId!: string | null;

  @Column({ type: 'text' })
  usuario!: string;

  @Column({ type: 'text' })
  tipo!: string;

  @Column({ type: 'text' })
  gravedad!: string;

  @Column({ type: 'text' })
  ubicacion!: string;

  @Column({ type: 'text' })
  descripcion!: string;

  @Column({ name: 'personas_involucradas', type: 'text', nullable: true })
  personasInvolucradas!: string | null;

  @Column({ name: 'acciones_tomadas', type: 'text' })
  accionesTomadas!: string;

  @Column({ name: 'reportado_a', type: 'text' })
  reportadoA!: string;

  @Column({ type: 'text', default: 'ABIERTO' })
  estado!: string;

  @Column({ type: 'int', default: 4 })
  prioridad!: number;

  @Column({ name: 'post_id', type: 'uuid', nullable: true })
  postId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('minuta_servicio')
export class MinutaServicio {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id!: string;

  @Column({ type: 'text' })
  fecha!: string;

  @Column({ type: 'text' })
  hora!: string;

  @Column({ name: 'fecha_registro', type: 'timestamptz' })
  fechaRegistro!: Date;

  @Column({ name: 'associate_id', type: 'uuid', nullable: true })
  associateId!: string | null;

  @Column({ type: 'text' })
  usuario!: string;

  @Column({ type: 'text' })
  anotaciones!: string;

  @Column({ type: 'text', nullable: true })
  novedades!: string | null;

  @Column({ name: 'post_id', type: 'uuid', nullable: true })
  postId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('minuta_entrega_puesto')
export class MinutaEntregaPuesto {
  @PrimaryColumn({ type: 'varchar', length: 20 })
  id!: string;

  @Column({ type: 'text' })
  fecha!: string;

  @Column({ type: 'text' })
  hora!: string;

  @Column({ name: 'fecha_registro', type: 'timestamptz' })
  fechaRegistro!: Date;

  @Column({ name: 'associate_id', type: 'uuid', nullable: true })
  associateId!: string | null;

  @Column({ name: 'turno_saliente', type: 'text' })
  turnoSaliente!: string;

  @Column({ name: 'turno_entrante', type: 'text' })
  turnoEntrante!: string;

  @Column({ name: 'vigilante_saliente', type: 'text' })
  vigilanteSaliente!: string;

  @Column({ name: 'vigilante_entrante', type: 'text' })
  vigilanteEntrante!: string;

  @Column({ name: 'nombre_del_puesto', type: 'text' })
  nombreDelPuesto!: string;

  @Column({ type: 'text', nullable: true })
  novedades!: string | null;

  @Column({ name: 'equipos_entregados', type: 'text' })
  equiposEntregados!: string;

  @Column({ name: 'llaves_entregadas', type: 'text' })
  llavesEntregadas!: string;

  @Column({ type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({ type: 'text', default: 'COMPLETADO' })
  estado!: string;

  @Column({ name: 'post_id', type: 'uuid', nullable: true })
  postId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
