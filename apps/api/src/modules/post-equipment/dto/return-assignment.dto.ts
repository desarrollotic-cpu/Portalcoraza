import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PostEquipmentStatus } from '../entities/post-equipment-assignment.entity';

export class ReturnPostEquipmentDto {
  @IsOptional()
  @IsIn([
    PostEquipmentStatus.RETURNED,
    PostEquipmentStatus.LOST,
    PostEquipmentStatus.WRITTEN_OFF,
  ])
  status?: PostEquipmentStatus.RETURNED | PostEquipmentStatus.LOST | PostEquipmentStatus.WRITTEN_OFF;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  returnCondition?: string;

  @IsOptional()
  @IsString()
  returnNotes?: string;
}
