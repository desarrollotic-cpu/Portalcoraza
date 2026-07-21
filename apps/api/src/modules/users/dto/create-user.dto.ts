import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MinLength,
} from 'class-validator';
import {
  USER_EMAIL_DOMAIN_MESSAGE,
  USER_EMAIL_DOMAIN_PATTERN,
} from '../../../common/constants/user-email';

export class CreateUserDto {
  @IsEmail()
  @Matches(USER_EMAIL_DOMAIN_PATTERN, { message: USER_EMAIL_DOMAIN_MESSAGE })
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsUUID()
  roleId!: string;
}
