import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ListShiftSchedulesDto {
  @IsUUID()
  postId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsUUID()
  associateId?: string;
}
