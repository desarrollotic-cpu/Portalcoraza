import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRetiredPersonnelDto {
  @IsString()
  @MaxLength(150)
  fullName!: string;

  @IsString()
  @MaxLength(50)
  idNumber!: string;

  @IsOptional()
  @IsDateString()
  retirementDate?: string;

  @IsOptional()
  @IsString()
  retirementReason?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  personType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  voxelsera?: string;
}
