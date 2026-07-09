import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { CatalogKind } from '../entities/catalog-value.entity';

export class CreateCatalogValueDto {
  @IsEnum(CatalogKind)
  kind!: CatalogKind;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  value!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
