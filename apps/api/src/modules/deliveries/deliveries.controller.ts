import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { RevertDeliveryDto } from './dto/revert-delivery.dto';
import { SignDeliveryDto } from './dto/sign-delivery.dto';
import { DeliveriesReportsService } from './deliveries-reports.service';
import { DeliveriesService } from './deliveries.service';

@Controller('deliveries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DeliveriesController {
  constructor(
    private readonly deliveriesService: DeliveriesService,
    private readonly reportsService: DeliveriesReportsService,
  ) {}

  @Get('associates')
  @RequirePermissions('inventory.view')
  listAssociates(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('workCenterId') workCenterId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 25;
    return this.deliveriesService.listAssociatesForDotacion({
      page: Number.isFinite(pageNum) ? pageNum : 1,
      limit: Number.isFinite(limitNum) ? limitNum : 25,
      search,
      workCenterId,
    });
  }

  @Get('reports/general')
  @RequirePermissions('inventory.view')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="reporte-general-dotacion.pdf"')
  async generalReport() {
    const buffer = await this.reportsService.buildGeneralReport();
    return new StreamableFile(buffer);
  }

  @Get('reports/by-item')
  @RequirePermissions('inventory.view')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="reporte-elemento-dotacion.pdf"')
  async itemReport(@Query('itemId') itemId: string) {
    const buffer = await this.reportsService.buildItemReport(itemId);
    return new StreamableFile(buffer);
  }

  @Get('reports/by-associate')
  @RequirePermissions('inventory.view')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="reporte-asociado-dotacion.pdf"')
  async associateReport(@Query('associateId') associateId: string) {
    const buffer = await this.reportsService.buildAssociateReport(associateId);
    return new StreamableFile(buffer);
  }

  @Get('overview')
  @RequirePermissions('inventory.view')
  overview() {
    return this.deliveriesService.getOverview();
  }

  @Get('without-dotacion')
  @RequirePermissions('inventory.view')
  withoutDotacion(@Query('months') months?: string) {
    const n = months ? parseInt(months, 10) : 7;
    return this.deliveriesService.listWithoutDotacion(Number.isFinite(n) && n > 0 ? n : 7);
  }

  @Get('eligible-associates')
  @RequirePermissions('deliveries.create')
  listEligibleAssociates() {
    return this.deliveriesService.listEligibleAssociates();
  }

  @Get()
  @RequirePermissions('deliveries.view')
  list(
    @Query('associateId') associateId?: string,
    @Query('postId') postId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    if (page || limit || search) {
      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 25;
      return this.deliveriesService.listPaginated({
        page: Number.isFinite(pageNum) ? pageNum : 1,
        limit: Number.isFinite(limitNum) ? limitNum : 25,
        associateId,
        postId,
        search,
      });
    }
    return this.deliveriesService.list({ associateId, postId });
  }

  @Post()
  @RequirePermissions('deliveries.create')
  create(@Body() dto: CreateDeliveryDto, @CurrentUser() user: JwtPayload) {
    return this.deliveriesService.create(dto, user.sub);
  }

  @Post(':id/sign')
  @RequirePermissions('deliveries.sign')
  sign(
    @Param('id') id: string,
    @Body() dto: SignDeliveryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.deliveriesService.sign(id, dto, user.sub);
  }

  @Post(':id/revert')
  @RequirePermissions('deliveries.revert')
  revert(
    @Param('id') id: string,
    @Body() dto: RevertDeliveryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.deliveriesService.revert(id, dto, user.sub);
  }
}
