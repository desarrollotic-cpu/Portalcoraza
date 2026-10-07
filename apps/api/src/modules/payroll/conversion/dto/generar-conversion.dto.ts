import { IsOptional, IsString, Matches } from 'class-validator';

/** Campos de texto que viajan junto al archivo (multipart). Si no vienen se usan los detectados. */
export class GenerarConversionDto {
  /** Mes con 2 dígitos, ej. `09`. */
  @IsOptional()
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])$/, { message: 'El período debe ser el mes con 2 dígitos (01 a 12).' })
  periodo?: string;

  /** `MM/DD/AAAA`. */
  @IsOptional()
  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/, {
    message: 'La fecha debe tener el formato MM/DD/AAAA.',
  })
  fecha?: string;
}
