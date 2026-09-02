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

  @Column({ name: 'contract_start', type: 'varchar', nullable: true, length: 80 })
  contractStart!: string | null;

  @Column({ name: 'contract_end', type: 'varchar', nullable: true, length: 80 })
  contractEnd!: string | null;

  /** Texto libre para plazo ("24 MESES", "INDEFINIDO", "2 AÑOS", "AUTOMATICO"). */
  @Column({ name: 'contract_term', type: 'varchar', nullable: true, length: 80 })
  contractTerm!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 120 })
  city!: string | null;

  @Column({ name: 'legal_rep_name', type: 'varchar', nullable: true, length: 200 })
  legalRepName!: string | null;

  @Column({ name: 'legal_rep_id', type: 'varchar', nullable: true, length: 30 })
  legalRepId!: string | null;

  @Column({ name: 'contact_email', type: 'text', nullable: true })
  contactEmail!: string | null;

  @Column({ type: 'text', nullable: true })
  observations!: string | null;

  // --- Documentación (texto libre: SI/NO/SOLICITUD/PDT/PARA FIRMAR/…) ---
  @Column({ name: 'doc_camara_comercio', type: 'varchar', nullable: true, length: 60 })
  docCamaraComercio!: string | null;

  @Column({ name: 'doc_rut', type: 'varchar', nullable: true, length: 60 })
  docRut!: string | null;

  @Column({ name: 'doc_cc_rep_legal', type: 'varchar', nullable: true, length: 60 })
  docCcRepLegal!: string | null;

  @Column({ name: 'doc_tratamiento_datos', type: 'varchar', nullable: true, length: 60 })
  docTratamientoDatos!: string | null;

  @Column({ name: 'doc_formulario_asociado', type: 'varchar', nullable: true, length: 60 })
  docFormularioAsociado!: string | null;

  @Column({ name: 'doc_acuerdo_seguridad', type: 'varchar', nullable: true, length: 60 })
  docAcuerdoSeguridad!: string | null;

  @Column({ name: 'doc_visita_cliente', type: 'varchar', nullable: true, length: 60 })
  docVisitaCliente!: string | null;

  /** Puede ser "SI", "NO" o texto libre ("SE HIZO LA SOLICITUD"). */
  @Column({ name: 'doc_estados_financieros', type: 'varchar', nullable: true, length: 80 })
  docEstadosFinancieros!: string | null;

  @Column({ name: 'doc_rues_camara', type: 'varchar', nullable: true, length: 60 })
  docRuesCamara!: string | null;

  // --- Fechas / textos de verificación en listas (ISO date o texto libre) ---
  @Column({ name: 'verif_encuesta_satisfaccion', type: 'varchar', nullable: true, length: 30 })
  verifEncuestaSatisfaccion!: string | null;

  @Column({ name: 'verif_ofac_rl', type: 'varchar', nullable: true, length: 30 })
  verifOfacRl!: string | null;

  @Column({ name: 'verif_ofac_persona_juridica', type: 'varchar', nullable: true, length: 30 })
  verifOfacPersonaJuridica!: string | null;

  @Column({ name: 'verif_central_riesgos_pn', type: 'varchar', nullable: true, length: 30 })
  verifCentralRiesgosPn!: string | null;

  @Column({ name: 'verif_central_riesgos_nit', type: 'varchar', nullable: true, length: 30 })
  verifCentralRiesgosNit!: string | null;

  @Column({ name: 'verif_procuraduria_nit', type: 'varchar', nullable: true, length: 30 })
  verifProcuraduriaNit!: string | null;

  @Column({ name: 'verif_procuraduria_rl', type: 'varchar', nullable: true, length: 30 })
  verifProcuraduriaRl!: string | null;

  @Column({ name: 'verif_procuraduria_rls', type: 'varchar', nullable: true, length: 30 })
  verifProcuraduriaRls!: string | null;

  @Column({ name: 'verif_procuraduria_rev_fiscal_ppal', type: 'varchar', nullable: true, length: 30 })
  verifProcuraduriaRevFiscalPpal!: string | null;

  @Column({ name: 'verif_procuraduria_rev_fiscal_sup', type: 'varchar', nullable: true, length: 30 })
  verifProcuraduriaRevFiscalSup!: string | null;

  @Column({ name: 'verif_procuraduria_miembros_junta', type: 'varchar', nullable: true, length: 30 })
  verifProcuraduriaMiembrosJunta!: string | null;

  @Column({ name: 'verif_policia_rp', type: 'varchar', nullable: true, length: 30 })
  verifPoliciaRp!: string | null;

  @Column({ name: 'verif_policia_rp_sup', type: 'varchar', nullable: true, length: 30 })
  verifPoliciaRpSup!: string | null;

  @Column({ name: 'verif_policia_rev_fiscal', type: 'varchar', nullable: true, length: 30 })
  verifPoliciaRevFiscal!: string | null;

  @Column({ name: 'verif_policia_rev_fiscal_sup', type: 'varchar', nullable: true, length: 30 })
  verifPoliciaRevFiscalSup!: string | null;

  @Column({ name: 'verif_policia_miembros_junta', type: 'varchar', nullable: true, length: 30 })
  verifPoliciaMiembrosJunta!: string | null;

  @Column({ name: 'verif_contraloria_rp', type: 'varchar', nullable: true, length: 30 })
  verifContraloriaRp!: string | null;

  @Column({ name: 'verif_contraloria_rp_sup', type: 'varchar', nullable: true, length: 30 })
  verifContraloriaRpSup!: string | null;

  @Column({ name: 'verif_contraloria_rev_fiscal', type: 'varchar', nullable: true, length: 30 })
  verifContraloriaRevFiscal!: string | null;

  @Column({ name: 'verif_contraloria_rev_fiscal_sup', type: 'varchar', nullable: true, length: 30 })
  verifContraloriaRevFiscalSup!: string | null;

  @Column({ name: 'verif_contraloria_miembros_junta', type: 'varchar', nullable: true, length: 30 })
  verifContraloriaMiembrosJunta!: string | null;

  @Column({ name: 'verif_supersociedades', type: 'varchar', nullable: true, length: 30 })
  verifSupersociedades!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
