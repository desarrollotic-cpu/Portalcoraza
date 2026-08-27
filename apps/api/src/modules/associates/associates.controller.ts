import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AssociatesService } from './associates.service';
import { AssociatesQueryDto } from './dto/associates-query.dto';
import { CreateAssociateDto } from './dto/create-associate.dto';
import { ReadmitAssociateDto } from './dto/readmit-associate.dto';
import { UpdateAssociateDto } from './dto/update-associate.dto';

@Controller('associates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssociatesController {
  constructor(private readonly service: AssociatesService) {}

  @Get()
  @RequirePermissions('associates.view')
  list(@Query() query: AssociatesQueryDto, @CurrentUser() user: JwtPayload) {
    return this.service.list(query, user);
  }

  @Get('lookup')
  @RequirePermissions('associates.view')
  lookup(@Query('status') status?: string) {
    return this.service.lookup(status);
  }

  @Get(':id')
  @RequirePermissions('associates.view')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.findOne(id, user);
  }

  @Get(':id/history')
  @RequirePermissions('associates.view')
  history(@Param('id') id: string) {
    return this.service.history(id);
  }

  @Get(':id/pdf-certificate')
  @RequirePermissions('associates.view')
  async getCertificatePdf(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const buffer = await this.service.generateCertificatePdf(id, user);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Certificado_Laboral_${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id/position-history')
  @RequirePermissions('associates.view')
  positionHistory(@Param('id') id: string) {
    return this.service.positionHistory(id);
  }

  @Post()
  @RequirePermissions('associates.create')
  create(
    @Body() dto: CreateAssociateDto,
    @CurrentUser() user: JwtPayload,
    @Ip() ip: string,
  ) {
    return this.service.create(dto, user, ip);
  }

  @Patch(':id')
  @RequirePermissions('associates.edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssociateDto,
    @CurrentUser() user: JwtPayload,
    @Ip() ip: string,
  ) {
    return this.service.update(id, dto, user, ip);
  }

  @Post(':id/readmit')
  @RequirePermissions('retirements.readmit')
  readmit(
    @Param('id') id: string,
    @Body() dto: ReadmitAssociateDto,
    @CurrentUser() user: JwtPayload,
    @Ip() ip: string,
  ) {
    return this.service.readmit(id, dto, user, ip);
  }

  @Post(':id/retire')
  @RequirePermissions('associates.retire')
  retire(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Ip() ip: string,
  ) {
    return this.service.markRetired(id, user, ip);
  }
}
