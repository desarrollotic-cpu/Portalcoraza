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
import { AssociatesService } from './associates.service';
import { CreateAssociateDto } from './dto/create-associate.dto';
import { UpdateAssociateDto } from './dto/update-associate.dto';
import { AssociateStatus } from './entities/associate.entity';

@Controller('associates')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssociatesController {
  constructor(private readonly associatesService: AssociatesService) {}

  @Get()
  @RequirePermissions('associates.view')
  findAll(@Query('status') status?: AssociateStatus) {
    return this.associatesService.findAll(status);
  }

  @Get(':id')
  @RequirePermissions('associates.view')
  findOne(@Param('id') id: string) {
    return this.associatesService.findOne(id);
  }

  @Get(':id/history')
  @RequirePermissions('associates.view')
  history(@Param('id') id: string) {
    return this.associatesService.history(id);
  }

  @Post()
  @RequirePermissions('associates.create')
  create(
    @Body() dto: CreateAssociateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.associatesService.create(dto, user.sub);
  }

  @Patch(':id')
  @RequirePermissions('associates.edit')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAssociateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.associatesService.update(id, dto, user.sub);
  }

  @Post(':id/retire')
  @RequirePermissions('associates.retire')
  retire(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.associatesService.retire(id, user.sub);
  }
}
