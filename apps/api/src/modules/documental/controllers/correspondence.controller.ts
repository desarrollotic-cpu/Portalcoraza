import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { CreateCorrespondenceDto } from '../dto/create-correspondence.dto';
import { CorrespondenceService } from '../services/correspondence.service';

@Controller('documental/correspondence')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CorrespondenceController {
  constructor(private readonly service: CorrespondenceService) {}

  @Get()
  @RequirePermissions('documental.view')
  list() {
    return this.service.list();
  }

  @Post('code')
  @RequirePermissions('documental.view')
  code(
    @Body() body: { depSigla?: string; depCode: string; serieCode: string; subserieCode?: string },
  ) {
    return this.service.previewCode(
      body.depSigla ?? body.depCode,
      body.depCode,
      body.serieCode,
      body.subserieCode,
    );
  }

  @Post()
  @RequirePermissions('documental.create')
  create(@Body() dto: CreateCorrespondenceDto, @CurrentUser() user: JwtPayload) {
    return this.service.create(dto, user.sub);
  }
}
