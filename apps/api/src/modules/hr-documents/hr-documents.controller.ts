import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { AssociateDocumentKind } from './entities/associate-document.entity';
import { HrDocumentsService } from './hr-documents.service';

@Controller('hr/documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HrDocumentsController {
  constructor(private readonly service: HrDocumentsService) {}

  @Get('associate/:associateId')
  @RequirePermissions('hr_documents.view')
  list(
    @Param('associateId') associateId: string,
    @Query('kind') kind?: AssociateDocumentKind,
  ) {
    return this.service.list(associateId, kind);
  }

  @Get(':id')
  @RequirePermissions('hr_documents.view')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('associate/:associateId')
  @RequirePermissions('hr_documents.upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('associateId') associateId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.upload(associateId, file, dto, user.sub);
  }

  @Delete(':id')
  @RequirePermissions('hr_documents.delete')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user.sub);
  }
}
