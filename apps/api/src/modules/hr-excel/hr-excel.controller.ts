import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ExecuteImportDto } from './dto/excel-import.dto';
import { HrExcelService } from './hr-excel.service';

@Controller('hr/excel')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HrExcelController {
  constructor(private readonly service: HrExcelService) {}

  @Post('import/preview')
  @RequirePermissions('hr_import.execute')
  @UseInterceptors(FileInterceptor('file'))
  preview(@UploadedFile() file: Express.Multer.File) {
    return this.service.parsePreview(file.buffer);
  }

  @Post('import/execute')
  @RequirePermissions('hr_import.execute')
  async execute(@Body() dto: ExecuteImportDto, @CurrentUser() user: JwtPayload) {
    return this.service.executeImport(dto.rows as never, user.sub);
  }

  @Get('template')
  @RequirePermissions('hr_import.execute')
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.service.exportTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-asociados.xlsx"');
    res.send(buffer);
  }

  @Get('export/associates')
  @RequirePermissions('hr_export.excel')
  async exportAssociates(@Res() res: Response) {
    const buffer = await this.service.exportAssociates();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="asociados.xlsx"');
    res.send(buffer);
  }

  @Get('export/compliance')
  @RequirePermissions('hr_export.excel')
  async exportCompliance(@Res() res: Response) {
    const buffer = await this.service.exportComplianceMatrix();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="matriz-sst.xlsx"');
    res.send(buffer);
  }
}
