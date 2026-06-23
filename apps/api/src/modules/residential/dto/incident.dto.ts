import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import {
  ResidentialIncidentPriority,
  ResidentialIncidentStatus,
} from '../entities/residential-incident.entity';

export class CreateIncidentDto {
  @IsUUID()
  unitId!: string;

  @IsString()
  @MaxLength(180)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ResidentialIncidentPriority)
  priority?: ResidentialIncidentPriority;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;
}

export class UpdateIncidentDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ResidentialIncidentStatus)
  status?: ResidentialIncidentStatus;

  @IsOptional()
  @IsEnum(ResidentialIncidentPriority)
  priority?: ResidentialIncidentPriority;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;
}
