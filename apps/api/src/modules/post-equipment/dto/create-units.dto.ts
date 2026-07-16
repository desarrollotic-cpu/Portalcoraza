import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePostEquipmentUnitsDto {
  @IsUUID()
  catalogId!: string;

  /** Crear N unidades con códigos automáticos (prefijo-01, prefijo-02...). */
  @ValidateIf((o: CreatePostEquipmentUnitsDto) => !o.unitCodes?.length)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  codePrefix?: string;

  /** O códigos explícitos uno a uno. */
  @ValidateIf((o: CreatePostEquipmentUnitsDto) => !o.quantity)
  @IsArray()
  @IsString({ each: true })
  unitCodes?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
