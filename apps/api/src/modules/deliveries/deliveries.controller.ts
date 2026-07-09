import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
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
import { DeliveriesService } from './deliveries.service';

@Controller('deliveries')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DeliveriesController {
  constructor(private readonly deliveriesService: DeliveriesService) {}

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
  ) {
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
