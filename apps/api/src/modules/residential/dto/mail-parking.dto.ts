import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateParkingSlotsDto {
  @IsInt()
  @Min(0)
  totalSlots!: number;
}

export class CreateMailRecordDto {
  @IsOptional()
  sender?: string;

  @IsOptional()
  subject?: string;
}
