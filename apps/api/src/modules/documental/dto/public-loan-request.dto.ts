import {
  IsDateString,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

const TIPOS = ['PERSONAL_RETIRADO', 'CONTRATO', 'MINUTA', 'OTRO'] as const;

/** Solicitud pública de préstamo: campos según el tipo de expediente (no texto libre). */
export class PublicLoanRequestDto {
  @IsIn(TIPOS, { message: 'Debe indicar qué tipo de expediente solicita' })
  tipo!: (typeof TIPOS)[number];

  @IsString()
  @MinLength(5)
  @MaxLength(120)
  nombre!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(50)
  cedula!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  departamento!: string;

  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsDateString()
  fechaDevolucion!: string;

  @IsString()
  @MinLength(12, { message: 'Explique el motivo con al menos 12 caracteres' })
  @MaxLength(400)
  motivo!: string;

  @ValidateIf((o: PublicLoanRequestDto) => o.tipo === 'PERSONAL_RETIRADO')
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  nombresRetirado?: string;

  @ValidateIf((o: PublicLoanRequestDto) => o.tipo === 'PERSONAL_RETIRADO')
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  apellidosRetirado?: string;

  @ValidateIf((o: PublicLoanRequestDto) => o.tipo === 'PERSONAL_RETIRADO')
  @IsString()
  @Matches(/^[0-9.\-\s]{5,20}$/, { message: 'Cédula del expediente inválida' })
  cedulaRetirado?: string;

  @ValidateIf((o: PublicLoanRequestDto) => o.tipo === 'PERSONAL_RETIRADO')
  @IsOptional()
  @IsString()
  @MaxLength(40)
  carpeta?: string;

  @ValidateIf((o: PublicLoanRequestDto) => o.tipo === 'CONTRATO')
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  clienteContrato?: string;

  @ValidateIf((o: PublicLoanRequestDto) => o.tipo === 'CONTRATO')
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  nitContrato?: string;

  @ValidateIf((o: PublicLoanRequestDto) => o.tipo === 'CONTRATO')
  @IsOptional()
  @IsString()
  @MaxLength(80)
  numeroContrato?: string;

  @ValidateIf((o: PublicLoanRequestDto) => o.tipo === 'CONTRATO')
  @IsOptional()
  @IsString()
  @MaxLength(80)
  tipoContrato?: string;

  @ValidateIf((o: PublicLoanRequestDto) => o.tipo === 'MINUTA')
  @IsIn(['SERVICIO', 'VISITANTES', 'CORRESPONDENCIA'])
  tipoMinuta?: string;

  @ValidateIf((o: PublicLoanRequestDto) => o.tipo === 'MINUTA')
  @IsString()
  @MinLength(3)
  @MaxLength(150)
  puestoMinuta?: string;

  @ValidateIf((o: PublicLoanRequestDto) => o.tipo === 'MINUTA')
  @IsDateString()
  fechaMinuta?: string;

  @ValidateIf((o: PublicLoanRequestDto) => o.tipo === 'MINUTA')
  @IsOptional()
  @IsString()
  @MaxLength(60)
  codigoMinuta?: string;

  @ValidateIf((o: PublicLoanRequestDto) => o.tipo === 'OTRO')
  @IsString()
  @MinLength(12, { message: 'Describa el documento con nombre, fechas o código' })
  @MaxLength(200)
  documento?: string;
}
