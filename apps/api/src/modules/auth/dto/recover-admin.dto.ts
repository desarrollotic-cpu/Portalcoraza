import { IsString, MinLength } from 'class-validator';

export class RecoverAdminDto {
  @IsString()
  @MinLength(16)
  recoveryKey!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}
