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

  @IsOptional() @IsBooleanString()
  isCritical?: string; // 'true' | 'false'

  @IsOptional() @IsNumberString()
  tenureMinYears?: string;

  @IsOptional() @IsNumberString()
  tenureMaxYears?: string;
}
