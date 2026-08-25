import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AccountingService } from './accounting.service';

@Controller('accounting')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('puc')
  @RequirePermissions('accounting.view')
  getPucTree() {
    return this.accountingService.getPucTree();
  }

  @Get('entries')
  @RequirePermissions('accounting.view')
  getEntries() {
    return this.accountingService.getEntries();
  }

  @Get('entries/:id')
  @RequirePermissions('accounting.view')
  getEntryById(@Param('id') id: string) {
    return this.accountingService.getEntryById(id);
  }

  @Post('entries')
  @RequirePermissions('accounting.manage')
  createEntry(
    @Body()
    dto: {
      concept: string;
      sourceModule: 'NOMINA' | 'DOTACION' | 'FACTURACION' | 'RECAUDO' | 'MANUAL';
      sourceId?: string;
      details: { accountCode: string; debitAmount: number; creditAmount: number; costCenter?: string }[];
    },
  ) {
    return this.accountingService.createEntry(dto);
  }
}
