import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { PostStatus, PostType } from '../entities/post.entity';

export class CreatePostDto {
  @IsString()
  @MaxLength(50)
  code!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsEnum(PostType)
  type?: PostType;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  clientName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
