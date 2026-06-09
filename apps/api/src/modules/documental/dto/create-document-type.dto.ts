import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDocumentTypeDto {
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
