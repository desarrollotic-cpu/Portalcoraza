import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
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
  @ValidateIf((dto: CreateDeliveryDto) => !dto.postId)
  @IsUUID()
  associateId?: string;

  @ValidateIf((dto: CreateDeliveryDto) => !dto.associateId)
  @IsUUID()
  postId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observations?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDeliveryItemDto)
  items!: CreateDeliveryItemDto[];
}
