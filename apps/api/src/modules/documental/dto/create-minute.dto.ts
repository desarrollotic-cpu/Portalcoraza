import { IsDateString, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMinuteDto {
  @IsString()
  @IsIn(['SERVICIO', 'VISITANTES', 'CORRESPONDENCIA'])
  minuteType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  postName?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  closeDate?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  voxelsera?: string;
}
