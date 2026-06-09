import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateDocumentRecordDto } from './dto/create-document-record.dto';
import { CreateDocumentTypeDto } from './dto/create-document-type.dto';
import { UpdateDocumentRecordDto } from './dto/update-document-record.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';
import { DocumentalService } from './documental.service';

@Controller('documental')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentalController {
  constructor(private readonly documentalService: DocumentalService) {}

  @Get('types')
  @RequirePermissions('documental.types.view')
  listTypes() {
    return this.documentalService.listTypes();
  }

  @Post('types')
  @RequirePermissions('documental.types.create')
  createType(@Body() dto: CreateDocumentTypeDto, @CurrentUser() user: JwtPayload) {
    return this.documentalService.createType(dto, user.sub);
  }

  @Patch('types/:id')
  @RequirePermissions('documental.types.edit')
  updateType(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentTypeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentalService.updateType(id, dto, user.sub);
  }

  @Get('records')
  @RequirePermissions('documental.records.view')
  listRecords(@Query('code') code?: string) {
    return this.documentalService.listRecords(code);
  }

  @Post('records')
  @RequirePermissions('documental.records.create')
  createRecord(
    @Body() dto: CreateDocumentRecordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentalService.createRecord(dto, user.sub);
  }

  @Patch('records/:id')
  @RequirePermissions('documental.records.edit')
  updateRecord(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentRecordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.documentalService.updateRecord(id, dto, user.sub);
  }
}
