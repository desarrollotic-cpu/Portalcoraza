import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateInventoryCategoryDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
