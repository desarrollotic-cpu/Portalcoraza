import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Payload usado para procesar el reingreso de un asociado en estado
 * RETIRADO. Permite reasignar carpeta, fecha de ingreso, cargo y centro
 * de trabajo sin perder el historial anterior.
 */
export class ReadmitAssociateDto {
  @IsOptional() @IsInt() @Min(0)
  folderNumber?: number;

  @IsDateString()
  hireDate!: string;

  @IsUUID()
  jobPositionId!: string;

  @IsOptional() @IsUUID()
  workCenterId?: string | null;

  @IsOptional() @IsString() @MaxLength(200)
  reason?: string;
}
