import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { CreateLibraryFileDto } from '../dto/create-library-file.dto';
import { CreateLibraryFolderDto } from '../dto/create-library-folder.dto';
import { LibraryService } from '../services/library.service';

@Controller('documental/library')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LibraryController {
  constructor(private readonly service: LibraryService) {}

  @Get('tree')
  @RequirePermissions('documental.view')
  tree() {
    return this.service.tree();
  }

  @Post('folders')
  @RequirePermissions('documental.manage')
  createFolder(@Body() dto: CreateLibraryFolderDto, @CurrentUser() user: JwtPayload) {
    return this.service.createFolder(dto, user.sub);
  }

  @Post('files')
  @RequirePermissions('documental.manage')
  createFile(@Body() dto: CreateLibraryFileDto, @CurrentUser() user: JwtPayload) {
    return this.service.createFile(dto, user.sub);
  }

  @Delete('folders/:id')
  @RequirePermissions('documental.manage')
  deleteFolder(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.deleteFolder(id, user.sub);
  }

  @Delete('files/:id')
  @RequirePermissions('documental.manage')
  deleteFile(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.deleteFile(id, user.sub);
  }
}
