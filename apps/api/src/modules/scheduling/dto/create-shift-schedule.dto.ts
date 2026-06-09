import {
  IsDateString,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ShiftType } from '../entities/shift-schedule.entity';

export class CreateShiftScheduleDto {
  @IsUUID()
  associateId!: string;

  @IsUUID()
  postId!: string;

  @IsEnum(ShiftType)
  shiftType!: ShiftType;

  @IsIn([8, 12])
  workdayHours!: 8 | 12;

  @IsDateString()
  shiftDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
