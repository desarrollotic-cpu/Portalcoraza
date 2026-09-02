import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
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
  @IsOptional() @IsDateString() contractStart?: string;
  @IsOptional() @IsDateString() contractEnd?: string;
  @IsOptional() @IsString() @MaxLength(120) city?: string;
  @IsOptional() @IsString() @MaxLength(200) legalRepName?: string;
  @IsOptional() @IsString() @MaxLength(30) legalRepId?: string;
  @IsOptional() @IsEmail() @MaxLength(200) contactEmail?: string;
  @IsOptional() @IsString() observations?: string;

  // --- Documentación (SI/NO) ---
  @IsOptional() @IsBoolean() docCamaraComercio?: boolean;
  @IsOptional() @IsBoolean() docRut?: boolean;
  @IsOptional() @IsBoolean() docCcRepLegal?: boolean;
  @IsOptional() @IsBoolean() docTratamientoDatos?: boolean;
  @IsOptional() @IsBoolean() docFormularioAsociado?: boolean;
  @IsOptional() @IsBoolean() docAcuerdoSeguridad?: boolean;
  @IsOptional() @IsBoolean() docVisitaCliente?: boolean;
  @IsOptional() @IsString() @MaxLength(80) docEstadosFinancieros?: string;
  @IsOptional() @IsBoolean() docRuesCamara?: boolean;

  // --- Fechas de verificación ---
  @IsOptional() @IsDateString() verifEncuestaSatisfaccion?: string;
  @IsOptional() @IsDateString() verifOfacRl?: string;
  @IsOptional() @IsDateString() verifOfacPersonaJuridica?: string;
  @IsOptional() @IsDateString() verifCentralRiesgosPn?: string;
  @IsOptional() @IsDateString() verifCentralRiesgosNit?: string;
  @IsOptional() @IsDateString() verifProcuraduriaNit?: string;
  @IsOptional() @IsDateString() verifProcuraduriaRl?: string;
  @IsOptional() @IsDateString() verifProcuraduriaRls?: string;
  @IsOptional() @IsDateString() verifProcuraduriaRevFiscalPpal?: string;
  @IsOptional() @IsDateString() verifProcuraduriaRevFiscalSup?: string;
  @IsOptional() @IsDateString() verifProcuraduriaMiembrosJunta?: string;
  @IsOptional() @IsDateString() verifPoliciaRp?: string;
  @IsOptional() @IsDateString() verifPoliciaRpSup?: string;
  @IsOptional() @IsDateString() verifPoliciaRevFiscal?: string;
  @IsOptional() @IsDateString() verifPoliciaRevFiscalSup?: string;
  @IsOptional() @IsDateString() verifPoliciaMiembrosJunta?: string;
  @IsOptional() @IsDateString() verifContraloriaRp?: string;
  @IsOptional() @IsDateString() verifContraloriaRpSup?: string;
  @IsOptional() @IsDateString() verifContraloriaRevFiscal?: string;
  @IsOptional() @IsDateString() verifContraloriaRevFiscalSup?: string;
  @IsOptional() @IsDateString() verifContraloriaMiembrosJunta?: string;
  @IsOptional() @IsDateString() verifSupersociedades?: string;
}
