import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
// ponytail: fechas de contrato y verif_* son texto libre (tal cual el archivo).
import { PostStatus, PostType } from '../entities/post.entity';

export class CreatePostDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional() @IsEnum(PostType) type?: PostType;
  @IsOptional() @IsEnum(PostStatus) status?: PostStatus;

  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() @MaxLength(200) clientName?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() @MaxLength(80) zone?: string;
  @IsOptional() @IsString() @MaxLength(200) contactName?: string;
  @IsOptional() @IsString() @MaxLength(200) phone?: string;
  @IsOptional() @IsString() @MaxLength(20) priority?: string;
  @IsOptional() @IsString() @MaxLength(80) contractNumber?: string;
  @IsOptional() @IsString() @MaxLength(80) serviceType?: string;
  @IsOptional() @IsBoolean() armed?: boolean;
  @IsOptional() @IsString() requirements?: string;
  @IsOptional() @IsString() instructions?: string;

  // --- Datos del asociado de negocio ---
  @IsOptional() @IsString() @MaxLength(30) nit?: string;
  @IsOptional() @IsString() @MaxLength(30) sector?: string;
  @IsOptional() @IsBoolean() basc?: boolean;
  @IsOptional() @IsString() @MaxLength(80) contractStart?: string;
  @IsOptional() @IsString() @MaxLength(80) contractEnd?: string;
  @IsOptional() @IsString() @MaxLength(80) contractTerm?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(200) legalRepName?: string;
  @IsOptional() @IsString() @MaxLength(30) legalRepId?: string;
  @IsOptional() @IsString() contactEmail?: string;
  @IsOptional() @IsString() observations?: string;

  // --- Documentación (texto libre: SI/NO/SOLICITUD/PDT/PARA FIRMAR/…) ---
  @IsOptional() @IsString() @MaxLength(60) docCamaraComercio?: string;
  @IsOptional() @IsString() @MaxLength(60) docRut?: string;
  @IsOptional() @IsString() @MaxLength(60) docCcRepLegal?: string;
  @IsOptional() @IsString() @MaxLength(60) docTratamientoDatos?: string;
  @IsOptional() @IsString() @MaxLength(60) docFormularioAsociado?: string;
  @IsOptional() @IsString() @MaxLength(60) docAcuerdoSeguridad?: string;
  @IsOptional() @IsString() @MaxLength(60) docVisitaCliente?: string;
  @IsOptional() @IsString() @MaxLength(80) docEstadosFinancieros?: string;
  @IsOptional() @IsString() @MaxLength(60) docRuesCamara?: string;

  // --- Verificación (fecha ISO o texto libre: PDT/NO/SI/fecha mal formateada) ---
  @IsOptional() @IsString() @MaxLength(30) verifEncuestaSatisfaccion?: string;
  @IsOptional() @IsString() @MaxLength(30) verifOfacRl?: string;
  @IsOptional() @IsString() @MaxLength(30) verifOfacPersonaJuridica?: string;
  @IsOptional() @IsString() @MaxLength(30) verifCentralRiesgosPn?: string;
  @IsOptional() @IsString() @MaxLength(30) verifCentralRiesgosNit?: string;
  @IsOptional() @IsString() @MaxLength(30) verifProcuraduriaNit?: string;
  @IsOptional() @IsString() @MaxLength(30) verifProcuraduriaRl?: string;
  @IsOptional() @IsString() @MaxLength(30) verifProcuraduriaRls?: string;
  @IsOptional() @IsString() @MaxLength(30) verifProcuraduriaRevFiscalPpal?: string;
  @IsOptional() @IsString() @MaxLength(30) verifProcuraduriaRevFiscalSup?: string;
  @IsOptional() @IsString() @MaxLength(30) verifProcuraduriaMiembrosJunta?: string;
  @IsOptional() @IsString() @MaxLength(30) verifPoliciaRp?: string;
  @IsOptional() @IsString() @MaxLength(30) verifPoliciaRpSup?: string;
  @IsOptional() @IsString() @MaxLength(30) verifPoliciaRevFiscal?: string;
  @IsOptional() @IsString() @MaxLength(30) verifPoliciaRevFiscalSup?: string;
  @IsOptional() @IsString() @MaxLength(30) verifPoliciaMiembrosJunta?: string;
  @IsOptional() @IsString() @MaxLength(30) verifContraloriaRp?: string;
  @IsOptional() @IsString() @MaxLength(30) verifContraloriaRpSup?: string;
  @IsOptional() @IsString() @MaxLength(30) verifContraloriaRevFiscal?: string;
  @IsOptional() @IsString() @MaxLength(30) verifContraloriaRevFiscalSup?: string;
  @IsOptional() @IsString() @MaxLength(30) verifContraloriaMiembrosJunta?: string;
  @IsOptional() @IsString() @MaxLength(30) verifSupersociedades?: string;
}
