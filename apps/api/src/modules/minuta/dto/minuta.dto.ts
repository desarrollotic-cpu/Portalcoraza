import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

/** Vigilante que registra (cuenta de puesto compartida). */
export class MinutaRegistradoDto {
  @IsString() @MinLength(2) registradoPor!: string;
}

export class MinutaVisitanteDto extends MinutaRegistradoDto {
  @IsString() @MinLength(2) nombre!: string;
  @IsOptional() @IsString() cedula?: string;
  @IsString() @MinLength(1) apto!: string;
  @IsOptional() @IsIn(['Si', 'No', 'SI', 'NO', 'si', 'no']) acompana?: string;
  @IsOptional() @IsString() vehiculo?: string;
  @IsOptional() @IsString() observaciones?: string;
  @IsOptional() @IsString() postId?: string;
}

export class MinutaCorrespondenciaDto extends MinutaRegistradoDto {
  @IsString() clase!: string;
  @IsString() @MinLength(1) apto!: string;
  @IsOptional() @IsString() destinatario?: string;
  @IsOptional() @IsString() remitente?: string;
  @IsOptional() @IsString() observaciones?: string;
  @IsOptional() @IsIn(['PENDIENTE', 'ENTREGADO']) estado?: string;
  @IsOptional() @IsString() recibidoPor?: string;
  @IsOptional() @IsString() postId?: string;
}

export class MinutaContratistaDto extends MinutaRegistradoDto {
  @IsString() @MinLength(2) nombre!: string;
  @IsString() @MinLength(6) cedula!: string;
  @IsString() @MinLength(2) empresa!: string;
  @IsOptional() @IsString() areaTrabajo?: string;
  @IsOptional() @IsString() equipos?: string;
  @IsString() @MinLength(2) autorizadoPor!: string;
  @IsOptional() @IsString() observaciones?: string;
  @IsOptional() @IsString() postId?: string;
}

export class MinutaDomiciliarioDto extends MinutaRegistradoDto {
  @IsString() empresa!: string;
  @IsString() tipoPedido!: string;
  @IsString() @MinLength(1) apto!: string;
  @IsOptional() @IsString() nombreDomiciliario?: string;
  @IsOptional() @IsString() placaMoto?: string;
  @IsOptional() @IsString() codigoPedido?: string;
  @IsOptional() @IsString() observaciones?: string;
  @IsOptional() @IsString() postId?: string;
}

export class MinutaIncidenteDto extends MinutaRegistradoDto {
  @IsString() tipo!: string;
  @IsIn(['BAJA', 'MEDIA', 'ALTA', 'CRITICA']) gravedad!: string;
  @IsString() @MinLength(2) ubicacion!: string;
  @IsString() @MinLength(3) descripcion!: string;
  @IsOptional() @IsString() personasInvolucradas?: string;
  @IsOptional() @IsString() accionesTomadas?: string;
  @IsOptional() @IsString() reportadoA?: string;
  @IsOptional() @IsString() postId?: string;
}

export class MinutaServicioDto extends MinutaRegistradoDto {
  @IsString() @MinLength(3) anotaciones!: string;
  @IsOptional() @IsString() novedades?: string;
  @IsOptional() @IsString() postId?: string;
}

export class MinutaEntregaDto extends MinutaRegistradoDto {
  @IsIn(['DIURNO', 'NOCTURNO', 'MIXTO']) turnoSaliente!: string;
  @IsIn(['DIURNO', 'NOCTURNO', 'MIXTO']) turnoEntrante!: string;
  @IsString() @MinLength(2) vigilanteSaliente!: string;
  @IsString() @MinLength(2) vigilanteEntrante!: string;
  @IsString() @MinLength(2) nombreDelPuesto!: string;
  @IsOptional() @IsString() novedades?: string;
  @IsOptional() @IsString() equiposEntregados?: string;
  @IsOptional() @IsString() llavesEntregadas?: string;
  @IsOptional() @IsString() observaciones?: string;
  @IsOptional() @IsString() postId?: string;
}

export class MinutaSalidaDto {
  @IsIn(['VISITANTE', 'CONTRATISTA', 'DOMICILIARIO']) tipo!: string;
}

export class MinutaEntregarCorrDto {
  @IsString() @MinLength(2) recibidoPor!: string;
}
