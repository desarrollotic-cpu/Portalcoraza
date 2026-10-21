import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateNumeralDto {
  @IsString() @MinLength(1) @MaxLength(40)
  numeral!: string;

  @IsString() @MinLength(3)
  descripcion!: string;

  /** 1.ª a 4.ª vez: >0 días de suspensión, 0 llamada de atención, -1 no aplica, -2 pecuniaria. */
  @IsArray() @ArrayMinSize(4) @ArrayMaxSize(4)
  @IsInt({ each: true }) @Min(-2, { each: true }) @Max(365, { each: true })
  diasPorVez!: number[];

  @IsOptional() @IsBoolean()
  activo?: boolean;
}

export class UpdateNumeralDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(40)
  numeral?: string;

  @IsOptional() @IsString() @MinLength(3)
  descripcion?: string;

  @IsOptional() @IsArray() @ArrayMinSize(4) @ArrayMaxSize(4)
  @IsInt({ each: true }) @Min(-2, { each: true }) @Max(365, { each: true })
  diasPorVez?: number[];

  @IsOptional() @IsBoolean()
  activo?: boolean;
}

export class CreateSanctionDto {
  @IsUUID()
  associateId!: string;

  @IsUUID()
  numeralId!: string;

  /** Si es la 1.ª, 2.ª, 3.ª o 4.ª vez que se sanciona por este numeral. */
  @IsInt() @Min(1) @Max(4)
  ocurrencia!: number;

  /** Primer día de la sanción (YYYY-MM-DD). No tiene valor por defecto a propósito. */
  @IsDateString()
  startDate!: string;

  @IsOptional() @IsString() @MaxLength(2000)
  motivo?: string;
}

export class AnnulSanctionDto {
  @IsString() @MinLength(5) @MaxLength(500)
  reason!: string;
}
