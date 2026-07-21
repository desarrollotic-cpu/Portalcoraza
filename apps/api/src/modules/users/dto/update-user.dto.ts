import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  USER_EMAIL_DOMAIN_MESSAGE,
  USER_EMAIL_DOMAIN_PATTERN,
} from '../../../common/constants/user-email';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  @Matches(USER_EMAIL_DOMAIN_PATTERN, { message: USER_EMAIL_DOMAIN_MESSAGE })
  email?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== undefined && v !== null && String(v).length > 0)
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  fullName?: string | null;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
