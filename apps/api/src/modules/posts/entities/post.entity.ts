import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PostStatus {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
}

export enum PostType {
  UNIDAD_RESIDENCIAL = 'UNIDAD_RESIDENCIAL',
  HOSPITAL = 'HOSPITAL',
  UNIVERSIDAD = 'UNIVERSIDAD',
  OBRA = 'OBRA',
  SERVICIO_ESPECIAL = 'SERVICIO_ESPECIAL',
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ length: 50 })
  code!: string;

  @Column({ length: 200 })
  name!: string;

  @Column({
    type: 'enum',
    enum: PostType,
    default: PostType.SERVICIO_ESPECIAL,
  })
  type!: PostType;

  @Column({
    type: 'enum',
    enum: PostStatus,
    default: PostStatus.ACTIVO,
  })
  status!: PostStatus;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ name: 'client_name', type: 'varchar', nullable: true, length: 200 })
  clientName!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  /** Centro de trabajo RRHH que este puesto representa operativamente. */
  @Column({ name: 'work_center_id', type: 'uuid', nullable: true, unique: true })
  workCenterId!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 80 })
  zone!: string | null;

  @Column({ name: 'contact_name', type: 'varchar', nullable: true, length: 200 })
  contactName!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 200 })
  phone!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 20 })
  priority!: string | null;

  @Column({ name: 'contract_number', type: 'varchar', nullable: true, length: 80 })
  contractNumber!: string | null;

  @Column({ name: 'service_type', type: 'varchar', nullable: true, length: 80 })
  serviceType!: string | null;

  @Column({ type: 'boolean', default: false })
  armed!: boolean;

  @Column({ type: 'text', nullable: true })
  requirements!: string | null;

  @Column({ type: 'text', nullable: true })
  instructions!: string | null;

  // ============================================================
  // Datos del asociado de negocio (cliente / contrato)
  // Cargados desde el archivo LISTADO_ASOCIADOS_DE_NEGOCIO_CLIENTES.
  // ============================================================

  @Column({ type: 'varchar', nullable: true, length: 30 })
  nit!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 30 })
  sector!: string | null;

  @Column({ type: 'boolean', nullable: true })
  basc!: boolean | null;

  @Column({ name: 'contract_start', type: 'date', nullable: true })
  contractStart!: string | null;

  @Column({ name: 'contract_end', type: 'date', nullable: true })
  contractEnd!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 120 })
  city!: string | null;

  @Column({ name: 'legal_rep_name', type: 'varchar', nullable: true, length: 200 })
  legalRepName!: string | null;

  @Column({ name: 'legal_rep_id', type: 'varchar', nullable: true, length: 30 })
  legalRepId!: string | null;

  @Column({ name: 'contact_email', type: 'varchar', nullable: true, length: 200 })
  contactEmail!: string | null;

  @Column({ type: 'text', nullable: true })
  observations!: string | null;

  // --- Documentación (SI/NO) ---
  @Column({ name: 'doc_camara_comercio', type: 'boolean', nullable: true })
  docCamaraComercio!: boolean | null;

  @Column({ name: 'doc_rut', type: 'boolean', nullable: true })
  docRut!: boolean | null;

  @Column({ name: 'doc_cc_rep_legal', type: 'boolean', nullable: true })
  docCcRepLegal!: boolean | null;

  @Column({ name: 'doc_tratamiento_datos', type: 'boolean', nullable: true })
  docTratamientoDatos!: boolean | null;

  @Column({ name: 'doc_formulario_asociado', type: 'boolean', nullable: true })
  docFormularioAsociado!: boolean | null;

  @Column({ name: 'doc_acuerdo_seguridad', type: 'boolean', nullable: true })
  docAcuerdoSeguridad!: boolean | null;

  @Column({ name: 'doc_visita_cliente', type: 'boolean', nullable: true })
  docVisitaCliente!: boolean | null;

  /** Puede ser "SI", "NO" o texto libre ("SE HIZO LA SOLICITUD"). */
  @Column({ name: 'doc_estados_financieros', type: 'varchar', nullable: true, length: 80 })
  docEstadosFinancieros!: string | null;

  @Column({ name: 'doc_rues_camara', type: 'boolean', nullable: true })
  docRuesCamara!: boolean | null;

  // --- Fechas de verificación en listas ---
  @Column({ name: 'verif_encuesta_satisfaccion', type: 'date', nullable: true })
  verifEncuestaSatisfaccion!: string | null;

  @Column({ name: 'verif_ofac_rl', type: 'date', nullable: true })
  verifOfacRl!: string | null;

  @Column({ name: 'verif_ofac_persona_juridica', type: 'date', nullable: true })
  verifOfacPersonaJuridica!: string | null;

  @Column({ name: 'verif_central_riesgos_pn', type: 'date', nullable: true })
  verifCentralRiesgosPn!: string | null;

  @Column({ name: 'verif_central_riesgos_nit', type: 'date', nullable: true })
  verifCentralRiesgosNit!: string | null;

  @Column({ name: 'verif_procuraduria_nit', type: 'date', nullable: true })
  verifProcuraduriaNit!: string | null;

  @Column({ name: 'verif_procuraduria_rl', type: 'date', nullable: true })
  verifProcuraduriaRl!: string | null;

  @Column({ name: 'verif_procuraduria_rls', type: 'date', nullable: true })
  verifProcuraduriaRls!: string | null;

  @Column({ name: 'verif_procuraduria_rev_fiscal_ppal', type: 'date', nullable: true })
  verifProcuraduriaRevFiscalPpal!: string | null;

  @Column({ name: 'verif_procuraduria_rev_fiscal_sup', type: 'date', nullable: true })
  verifProcuraduriaRevFiscalSup!: string | null;

  @Column({ name: 'verif_procuraduria_miembros_junta', type: 'date', nullable: true })
  verifProcuraduriaMiembrosJunta!: string | null;

  @Column({ name: 'verif_policia_rp', type: 'date', nullable: true })
  verifPoliciaRp!: string | null;

  @Column({ name: 'verif_policia_rp_sup', type: 'date', nullable: true })
  verifPoliciaRpSup!: string | null;

  @Column({ name: 'verif_policia_rev_fiscal', type: 'date', nullable: true })
  verifPoliciaRevFiscal!: string | null;

  @Column({ name: 'verif_policia_rev_fiscal_sup', type: 'date', nullable: true })
  verifPoliciaRevFiscalSup!: string | null;

  @Column({ name: 'verif_policia_miembros_junta', type: 'date', nullable: true })
  verifPoliciaMiembrosJunta!: string | null;

  @Column({ name: 'verif_contraloria_rp', type: 'date', nullable: true })
  verifContraloriaRp!: string | null;

  @Column({ name: 'verif_contraloria_rp_sup', type: 'date', nullable: true })
  verifContraloriaRpSup!: string | null;

  @Column({ name: 'verif_contraloria_rev_fiscal', type: 'date', nullable: true })
  verifContraloriaRevFiscal!: string | null;

  @Column({ name: 'verif_contraloria_rev_fiscal_sup', type: 'date', nullable: true })
  verifContraloriaRevFiscalSup!: string | null;

  @Column({ name: 'verif_contraloria_miembros_junta', type: 'date', nullable: true })
  verifContraloriaMiembrosJunta!: string | null;

  @Column({ name: 'verif_supersociedades', type: 'date', nullable: true })
  verifSupersociedades!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
