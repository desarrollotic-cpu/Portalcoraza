import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class BulkAssignPostEquipmentDto {
  @IsUUID()
  postId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  unitIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  conditionOnDelivery?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
