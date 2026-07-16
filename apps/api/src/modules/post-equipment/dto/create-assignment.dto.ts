import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePostEquipmentAssignmentDto {
  @IsUUID()
  postId!: string;

  /** Preferido: asignar una unidad concreta del inventario de elementos. */
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @ValidateIf((o: CreatePostEquipmentAssignmentDto) => !o.unitId && !o.customName)
  @IsUUID()
  catalogId?: string;

  @ValidateIf((o: CreatePostEquipmentAssignmentDto) => !o.unitId && !o.catalogId)
  @IsString()
  @MaxLength(200)
  customName?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialOrTag?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  conditionOnDelivery?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  deliveredAt?: string;
}
