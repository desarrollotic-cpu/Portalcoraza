import { IsEnum, IsNumberString, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ReservationApprovalMode } from '../entities/residential-unit.entity';

export class CreateResidentialUnitDto {
  @IsUUID()
  postId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  block?: string;

  @IsString()
  @MaxLength(40)
  number!: string;

  @IsOptional()
  @IsNumberString()
  areaM2?: string;

  @IsOptional()
  @IsEnum(ReservationApprovalMode)
  reservationApprovalMode?: ReservationApprovalMode;
}

export class UpdateResidentialUnitDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  block?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  number?: string;

  @IsOptional()
  @IsNumberString()
  areaM2?: string;

  @IsOptional()
  @IsEnum(ReservationApprovalMode)
  reservationApprovalMode?: ReservationApprovalMode;
}
