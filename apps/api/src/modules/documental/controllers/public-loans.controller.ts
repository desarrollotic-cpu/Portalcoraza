import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import { PublicLoanRequestDto } from '../dto/public-loan-request.dto';
import { LoansService } from '../services/loans.service';

/** Endpoint público (sin login) para solicitudes de préstamo por enlace compartible. */
@Public()
@Controller('public/documental')
export class PublicLoansController {
  constructor(private readonly service: LoansService) {}

  @Post('loan-request')
  request(@Body() dto: PublicLoanRequestDto) {
    return this.service.publicRequest(dto);
  }
}
