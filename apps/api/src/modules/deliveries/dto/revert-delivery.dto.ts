import { IsString, MinLength } from 'class-validator';

export class RevertDeliveryDto {
  @IsString()
  @MinLength(10)
  reason!: string;
}
