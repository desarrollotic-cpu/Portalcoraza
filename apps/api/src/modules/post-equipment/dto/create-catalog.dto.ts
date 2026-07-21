import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePostEquipmentCatalogDto {
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_\-]+$/i, {
    message: 'El código solo puede tener letras, números, guiones y guión bajo',
  })
  code!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  approximateValue?: number;

  @IsOptional()
  @IsString()
  specs?: string;

  @IsOptional()
  @IsBoolean()
  requiresReturn?: boolean;

  /** Cantidad inicial de unidades a crear (opcional). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  initialQuantity?: number;
}
