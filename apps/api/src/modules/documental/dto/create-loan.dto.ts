import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLoanDto {
  @IsString()
  @MaxLength(150)
  requester!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  document?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  documentCode?: string;

  @IsOptional()
  @IsDateString()
  loanDate?: string;

  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  email?: string;
}
