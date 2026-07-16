import { IsOptional, IsString } from 'class-validator';

export class ExitReceptionVisitorDto {
  @IsOptional()
  @IsString()
  exitNotes?: string;
}
