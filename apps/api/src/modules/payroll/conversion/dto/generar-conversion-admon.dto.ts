import { IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { GenerarConversionDto } from './generar-conversion.dto';

/**
 * Campos que viajan junto al archivo de compensación administrativa.
 * Hereda período y fecha; añade la hoja, porque el libro trae una por quincena.
 */
export class GenerarConversionAdmonDto extends GenerarConversionDto {
  /** Nombre exacto de la hoja, ej. `SEPTIEMBRE- 30`. Si no viene, se usa la última. */
  @IsOptional()
  @IsString()
  @MaxLength(80)
  hoja?: string;

  /**
   * Reasignaciones elegidas en la previsualización, como JSON:
   * `[{"cedula":"1055962814","de":"525","a":"524"}]`.
   * Viaja como texto porque la petición es multipart (lleva el archivo).
   */
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  ajustes?: string;

  /**
   * `combinado` (por defecto) escribe el par tal cual, `030-031`.
   * `habitual` escribe un solo código y deja la línea marcada para revisar.
   */
  @IsOptional()
  @IsIn(['combinado', 'habitual'], {
    message: 'El modo de código doble debe ser «combinado» o «habitual».',
  })
  modoCodigoDoble?: 'combinado' | 'habitual';
}

/** Reasignación manual de una línea a su código alterno (ej. funeraria 525 -> 524). */
export class AjusteCodigoDto {
  @IsString()
  @Matches(/^\d{6,15}$/, { message: 'La cédula debe tener solo dígitos.' })
  cedula!: string;

  @IsString()
  @Matches(/^\d{3}$/, { message: 'El código debe tener 3 dígitos.' })
  de!: string;

  @IsString()
  @Matches(/^\d{3}$/, { message: 'El código debe tener 3 dígitos.' })
  a!: string;
}
