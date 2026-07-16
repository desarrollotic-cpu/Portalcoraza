import {
  Body,
  Controller,
  Delete,
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
import { CreateIncidentDto, UpdateIncidentDto } from './dto/incident.dto';
import { CreateMailRecordDto, UpdateParkingSlotsDto } from './dto/mail-parking.dto';
import { CreatePackageDto } from './dto/package.dto';
import {
  CreatePersonDto,
  CreateResidentDto,
  UpdatePersonDto,
  UpdateResidentDto,
} from './dto/person.dto';
import { CreateReservationDto, UpdateReservationStatusDto } from './dto/reservation.dto';
import {
  CreateResidentialUnitDto,
  UpdateResidentialUnitDto,
} from './dto/residential-unit.dto';
import {
  CreateVehicleDto,
  CreateVisitorDto,
  UpdateVehicleDto,
} from './dto/visitor-vehicle.dto';
import { PackageStatus } from './entities/package.entity';
import { ReservationStatus } from './entities/reservation.entity';
import { ResidentialIncidentStatus } from './entities/residential-incident.entity';
import { IncidentsService } from './incidents.service';
import { PackagesService } from './packages.service';
import { ReservationsService } from './reservations.service';
import { ResidentialService } from './residential.service';
import { VehiclesService } from './vehicles.service';
import { VisitorsService } from './visitors.service';

@Controller('residential')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ResidentialController {
  constructor(
    private readonly residentialService: ResidentialService,
    private readonly visitorsService: VisitorsService,
    private readonly packagesService: PackagesService,
    private readonly vehiclesService: VehiclesService,
    private readonly reservationsService: ReservationsService,
    private readonly incidentsService: IncidentsService,
  ) {}

  @Get('posts')
  @RequirePermissions('residential.view')
  listPosts(@CurrentUser() user: JwtPayload) {
    return this.residentialService.listPosts(user);
  }

  @Get('units')
  @RequirePermissions('residential.view')
  listUnits(@CurrentUser() user: JwtPayload) {
    return this.residentialService.listUnits(user);
  }

  @Post('units')
  @RequirePermissions('residential.manage')
  createUnit(@Body() dto: CreateResidentialUnitDto, @CurrentUser() user: JwtPayload) {
    return this.residentialService.createUnit(dto, user);
  }

  @Patch('units/:unitId')
  @RequirePermissions('residential.manage')
  updateUnit(
    @Param('unitId') unitId: string,
    @Body() dto: UpdateResidentialUnitDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.residentialService.updateUnit(unitId, dto, user);
  }

  @Get('units/:unitId/residents')
  @RequirePermissions('residential.view')
  listResidents(@Param('unitId') unitId: string, @CurrentUser() user: JwtPayload) {
    return this.residentialService.listResidents(unitId, user);
  }

  @Post('units/:unitId/residents')
  @RequirePermissions('residential.manage')
  createResident(
    @Param('unitId') unitId: string,
    @Body() dto: CreateResidentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.residentialService.createResident(unitId, dto, user);
  }

  @Patch('units/:unitId/residents/:id')
  @RequirePermissions('residential.manage')
  updateResident(
    @Param('unitId') unitId: string,
    @Param('id') id: string,
    @Body() dto: UpdateResidentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.residentialService.updateResident(unitId, id, dto, user);
  }

  @Get('units/:unitId/owners')
  @RequirePermissions('residential.view')
  listOwners(@Param('unitId') unitId: string, @CurrentUser() user: JwtPayload) {
    return this.residentialService.listOwners(unitId, user);
  }

  @Post('units/:unitId/owners')
  @RequirePermissions('residential.manage')
  createOwner(
    @Param('unitId') unitId: string,
    @Body() dto: CreatePersonDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.residentialService.createOwner(unitId, dto, user);
  }

  @Patch('units/:unitId/owners/:id')
  @RequirePermissions('residential.manage')
  updateOwner(
    @Param('unitId') unitId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePersonDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.residentialService.updateOwner(unitId, id, dto, user);
  }

  @Get('units/:unitId/tenants')
  @RequirePermissions('residential.view')
  listTenants(@Param('unitId') unitId: string, @CurrentUser() user: JwtPayload) {
    return this.residentialService.listTenants(unitId, user);
  }

  @Post('units/:unitId/tenants')
  @RequirePermissions('residential.manage')
  createTenant(
    @Param('unitId') unitId: string,
    @Body() dto: CreatePersonDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.residentialService.createTenant(unitId, dto, user);
  }

  @Patch('units/:unitId/tenants/:id')
  @RequirePermissions('residential.manage')
  updateTenant(
    @Param('unitId') unitId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePersonDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.residentialService.updateTenant(unitId, id, dto, user);
  }

  @Get('units/:unitId/vehicles')
  @RequirePermissions('residential.view')
  listVehicles(@Param('unitId') unitId: string, @CurrentUser() user: JwtPayload) {
    return this.vehiclesService.listByUnit(unitId, user);
  }

  @Post('units/:unitId/vehicles')
  @RequirePermissions('residential.manage')
  createVehicle(
    @Param('unitId') unitId: string,
    @Body() dto: CreateVehicleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vehiclesService.create(unitId, dto, user);
  }

  @Patch('units/:unitId/vehicles/:id')
  @RequirePermissions('residential.manage')
  updateVehicle(
    @Param('unitId') unitId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vehiclesService.update(unitId, id, dto, user);
  }

  @Delete('units/:unitId/vehicles/:id')
  @RequirePermissions('residential.manage')
  removeVehicle(
    @Param('unitId') unitId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.vehiclesService.remove(unitId, id, user);
  }

  @Get('units/:unitId/mail')
  @RequirePermissions('residential.view')
  listMail(@Param('unitId') unitId: string, @CurrentUser() user: JwtPayload) {
    return this.residentialService.listMail(unitId, user);
  }

  @Post('units/:unitId/mail')
  @RequirePermissions('residential.manage')
  createMail(
    @Param('unitId') unitId: string,
    @Body() dto: CreateMailRecordDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.residentialService.createMail(unitId, dto, user);
  }

  @Patch('units/:unitId/mail/:id/deliver')
  @RequirePermissions('residential.manage')
  deliverMail(
    @Param('unitId') unitId: string,
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.residentialService.deliverMail(unitId, id, user);
  }

  @Get('visitors/active')
  @RequirePermissions('residential.visitors')
  listActiveVisitors(
    @CurrentUser() user: JwtPayload,
    @Query('unitId') unitId?: string,
  ) {
    return this.visitorsService.listActive(user, unitId);
  }

  @Get('visitors')
  @RequirePermissions('residential.visitors')
  listVisitors(
    @CurrentUser() user: JwtPayload,
    @Query('unitId') unitId?: string,
  ) {
    return this.visitorsService.listHistory(user, unitId);
  }

  @Post('visitors/entry')
  @RequirePermissions('residential.visitors')
  registerVisitorEntry(
    @Body() dto: CreateVisitorDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.visitorsService.registerEntry(dto, user);
  }

  @Patch('visitors/:id/exit')
  @RequirePermissions('residential.visitors')
  registerVisitorExit(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.visitorsService.registerExit(id, user);
  }

  @Get('units/:unitId/virtual-log')
  @RequirePermissions('residential.view')
  listVirtualLog(@Param('unitId') unitId: string, @CurrentUser() user: JwtPayload) {
    return this.visitorsService.listVirtualLog(unitId, user);
  }

  @Get('parking')
  @RequirePermissions('residential.parking')
  listParking(@CurrentUser() user: JwtPayload) {
    return this.visitorsService.listParking(user);
  }

  @Get('units/:unitId/parking')
  @RequirePermissions('residential.parking')
  getParkingByUnit(@Param('unitId') unitId: string, @CurrentUser() user: JwtPayload) {
    return this.visitorsService.getParkingByUnit(unitId, user);
  }

  @Patch('units/:unitId/parking')
  @RequirePermissions('residential.parking')
  updateParkingCapacity(
    @Param('unitId') unitId: string,
    @Body() dto: UpdateParkingSlotsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.visitorsService.updateParkingCapacity(unitId, dto, user);
  }

  @Get('packages')
  @RequirePermissions('residential.packages')
  listPackages(
    @CurrentUser() user: JwtPayload,
    @Query('unitId') unitId?: string,
    @Query('status') status?: PackageStatus,
  ) {
    return this.packagesService.list(user, unitId, status);
  }

  @Post('packages')
  @RequirePermissions('residential.packages')
  receivePackage(@Body() dto: CreatePackageDto, @CurrentUser() user: JwtPayload) {
    return this.packagesService.receive(dto, user);
  }

  @Patch('packages/:id/deliver')
  @RequirePermissions('residential.packages')
  deliverPackage(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.packagesService.deliver(id, user);
  }

  @Get('reservations')
  @RequirePermissions('residential.reservations')
  listReservations(
    @CurrentUser() user: JwtPayload,
    @Query('unitId') unitId?: string,
    @Query('status') status?: ReservationStatus,
  ) {
    return this.reservationsService.list(user, unitId, status);
  }

  @Post('reservations')
  @RequirePermissions('residential.reservations')
  createReservation(
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reservationsService.create(dto, user);
  }

  @Patch('reservations/:id/status')
  @RequirePermissions('residential.reservations')
  updateReservationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReservationStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reservationsService.updateStatus(id, dto, user);
  }

  @Get('incidents')
  @RequirePermissions('residential.incidents')
  listIncidents(
    @CurrentUser() user: JwtPayload,
    @Query('unitId') unitId?: string,
    @Query('status') status?: ResidentialIncidentStatus,
  ) {
    return this.incidentsService.list(user, unitId, status);
  }

  @Get('incidents/:id')
  @RequirePermissions('residential.incidents')
  getIncident(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.incidentsService.getById(id, user);
  }

  @Post('incidents')
  @RequirePermissions('residential.incidents')
  createIncident(@Body() dto: CreateIncidentDto, @CurrentUser() user: JwtPayload) {
    return this.incidentsService.create(dto, user);
  }

  @Patch('incidents/:id')
  @RequirePermissions('residential.incidents')
  updateIncident(
    @Param('id') id: string,
    @Body() dto: UpdateIncidentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.incidentsService.update(id, dto, user);
  }
}
