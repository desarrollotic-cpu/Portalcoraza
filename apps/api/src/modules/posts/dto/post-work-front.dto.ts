import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreatePostWorkFrontDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  frontNumber?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  hours?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  detail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdatePostWorkFrontDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  frontNumber?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  hours?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  detail?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
