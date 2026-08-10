import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateLibraryFolderDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}
