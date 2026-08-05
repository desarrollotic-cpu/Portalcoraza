import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class ResolveWorkflowDto {
  @IsUUID()
  id!: string;

  @IsString()
  @IsIn(['APROBAR', 'RECHAZAR'])
  decision!: string;

  @IsOptional()
  @IsString()
  comment?: string;
}
