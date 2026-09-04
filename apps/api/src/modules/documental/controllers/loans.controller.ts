import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequireAnyPermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { CreateLoanDto } from '../dto/create-loan.dto';
import { LoansService } from '../services/loans.service';

@Controller('documental/loans')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LoansController {
  constructor(private readonly service: LoansService) {}

  @Get()
  @RequireAnyPermissions('documental.view', 'documental.loans')
  list() {
    return this.service.list();
  }

  @Post()
  @RequireAnyPermissions('documental.create', 'documental.loans')
  create(@Body() dto: CreateLoanDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  @Get('test-email-direct')
  async testEmailDirect() {
    try {
      const res = await this.service.testDirectEmail();
      return { success: true, detail: res };
    } catch (err: any) {
      return { success: false, error: err.message, stack: err.stack };
    }
  }

  @Get(':id/mails')
  @RequireAnyPermissions('documental.view', 'documental.loans')
  listMails(@Param('id') id: string) {
    return this.service.listMails(id);
  }

  @Put(':id/approve')
  @RequireAnyPermissions('documental.manage', 'documental.loans')
  approve(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.approve(id, user.sub);
  }

  @Put(':id/reject')
  @RequireAnyPermissions('documental.manage', 'documental.loans')
  reject(
    @Param('id') id: string,
    @Body() body: { motivoRechazo?: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.reject(id, body.motivoRechazo, user.sub);
  }

  @Put(':id/return')
  @RequireAnyPermissions('documental.manage', 'documental.loans')
  returnLoan(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.returnLoan(id, user.sub);
  }

  /** Envía el correo según estado + fecha (aprobación, vencimiento, rechazo o devolución). */
  @Post(':id/send-reminder')
  @RequireAnyPermissions('documental.manage', 'documental.loans')
  sendReminder(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.sendOverdueEmailManual(id, user.sub);
  }
}
