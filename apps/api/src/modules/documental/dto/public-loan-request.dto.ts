import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

/** Solicitud pública de préstamo (formulario compartible, sin login). */
export class PublicLoanRequestDto {
  @IsString()
  @MaxLength(120)
  nombre!: string;

  @IsString()
  @MaxLength(50)
  cedula!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  departamento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  documento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;

  @IsOptional()
  @IsDateString()
  fechaDevolucion?: string;
}
