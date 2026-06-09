import { IsString, MinLength } from 'class-validator';

export class SignDeliveryDto {
  @IsString()
  @MinLength(20)
  signatureData!: string;
}
