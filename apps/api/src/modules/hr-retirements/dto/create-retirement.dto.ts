import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RetirementLiquidationStatus, RetirementWouldReturn } from '../entities/retirement.entity';

/**
 * Payload de creación de un retiro. Incluye los datos administrativos (fecha,
 * motivos), la encuesta de salida de 7 dimensiones (valoración 1..5) y los
 * campos abiertos (observaciones, lo que menos le gustó, si volvería).
 */
export class CreateRetirementDto {
  @IsUUID()
  associateId!: string;

  @IsDateString()
  retirementDate!: string;

  @IsUUID()
  reasonId!: string;

  @IsUUID()
  causeId!: string;

  @IsOptional() @IsEnum(RetirementLiquidationStatus)
  liquidationStatus?: RetirementLiquidationStatus;

  @IsOptional() @IsString() @MaxLength(2000)
  observations?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  leastLiked?: string;

  @IsOptional() @IsEnum(RetirementWouldReturn)
  wouldReturn?: RetirementWouldReturn;

  // ─── Encuesta de salida (Likert 1..5) ────────────────────────────────
  @IsInt() @Min(1) @Max(5) surveyPhysicalEnv!: number;
  @IsInt() @Min(1) @Max(5) surveyInduction!: number;
  @IsInt() @Min(1) @Max(5) surveyReinduction!: number;
  @IsInt() @Min(1) @Max(5) surveyTraining!: number;
  @IsInt() @Min(1) @Max(5) surveyGroupMotivation!: number;
  @IsInt() @Min(1) @Max(5) surveyRecognition!: number;
  @IsInt() @Min(1) @Max(5) surveyCompensation!: number;
}
