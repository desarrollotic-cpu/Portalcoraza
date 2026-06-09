import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateDeliveryItemDto {
  @IsUUID()
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateDeliveryDto {
  @IsUUID()
  associateId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDeliveryItemDto)
  items!: CreateDeliveryItemDto[];
}
