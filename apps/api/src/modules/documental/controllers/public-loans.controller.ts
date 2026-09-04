import { Body, Controller, Post } from '@nestjs/common';
import { IsEmail, IsString } from 'class-validator';
import { Public } from '../../../common/decorators/public.decorator';
import { PublicLoanRequestDto } from '../dto/public-loan-request.dto';
import { LoansService } from '../services/loans.service';

class VerifyEmailDto {
  @IsString()
  @IsEmail()
  email!: string;
}

/** Endpoint público (sin login) para solicitudes de préstamo por enlace compartible. */
@Public()
@Controller('public/documental')
export class PublicLoansController {
  constructor(private readonly service: LoansService) {}

  @Post('verify-email')
  verifyEmail(@Body() body: VerifyEmailDto) {
    return this.service.verifyPublicEmail(body.email);
  }

  @Post('loan-request')
  request(@Body() dto: PublicLoanRequestDto) {
    return this.service.publicRequest(dto);
  }
}
