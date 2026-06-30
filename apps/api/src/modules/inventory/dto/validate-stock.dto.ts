import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class StockElementDto {
  @IsString()
  category!: string;

  @IsOptional()
  @IsString()
  talla?: string;

  @IsOptional()
  @IsString()
  genero?: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class ValidateStockDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockElementDto)
  elementos!: StockElementDto[];
}
