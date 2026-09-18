import { IsBooleanString, IsEnum, IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator';
import { AssociateStatus } from '../entities/associate.entity';

/**
 * Filtros del directorio de asociados.
 */
export class AssociatesQueryDto {
  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsEnum(AssociateStatus)
  status?: AssociateStatus;

  @IsOptional() @IsUUID()
  workCenterId?: string;

  @IsOptional() @IsUUID()
  jobPositionId?: string;

  @IsOptional() @IsUUID()
  educationLevelId?: string;

  @IsOptional() @IsBooleanString()
  isCritical?: string; // 'true' | 'false'

  @IsOptional() @IsNumberString()
  tenureMinYears?: string;

  @IsOptional() @IsNumberString()
  tenureMaxYears?: string;

  @IsOptional() @IsNumberString()
  tenureMinMonths?: string;

  @IsOptional() @IsNumberString()
  tenureMaxMonths?: string;

  /** Fecha ingreso desde (YYYY-MM-DD). */
  @IsOptional() @IsString()
  hireFrom?: string;

  /** Fecha ingreso hasta (YYYY-MM-DD). */
  @IsOptional() @IsString()
  hireTo?: string;

  /** Fecha de baja desde (YYYY-MM-DD). Encuesta de retiro o, si no hay, día en que pasó a RETIRADO/INACTIVO. */
  @IsOptional() @IsString()
  retiredFrom?: string;

  /** Fecha de baja hasta (YYYY-MM-DD). */
  @IsOptional() @IsString()
  retiredTo?: string;

  @IsOptional() @IsNumberString()
  page?: string;

  @IsOptional() @IsNumberString()
  limit?: string;
}
