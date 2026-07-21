import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { CreateAbsenceDto, UpdateAbsenceDto } from './dto/absence.dto';
import { AbsenteeismKind } from './entities/associate-absence.entity';
import { HrAbsenteeismService } from './hr-absenteeism.service';

@Controller('hr/absences')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HrAbsenteeismController {
  constructor(private readonly service: HrAbsenteeismService) {}

  @Get()
  @RequirePermissions('absences.view')
  list(
    @Query('kind') kind?: AbsenteeismKind,
    @Query('associateId') associateId?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.list({ kind, associateId, search, from, to });
  }

  @Get('stats')
  @RequirePermissions('absences.view')
  stats() {
    return this.service.stats();
  }

  @Get('diagnoses')
  @RequirePermissions('absences.view')
  diagnoses(@Query('q') q?: string, @Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 20;
    return this.service.searchDiagnoses(q ?? '', Number.isFinite(n) ? n : 20);
  }

  @Post('import/excel')
  @RequirePermissions('absences.import')
  @UseInterceptors(FileInterceptor('file'))
  importExcel(
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Adjunta un archivo Excel (.xlsx)');
    }
    return this.service.importExcel(file.buffer, user.sub);
  }

  @Get(':id')
  @RequirePermissions('absences.view')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @RequirePermissions('absences.create')
  create(@Body() dto: CreateAbsenceDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('absences.edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAbsenceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.update(id, dto, user.sub);
  }

  @Delete(':id')
  @RequirePermissions('absences.delete')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.service.remove(id, user.sub);
  }
}
