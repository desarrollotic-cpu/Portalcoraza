import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Post } from '../posts/entities/post.entity';
import { UserPost } from '../users/entities/user-post.entity';
import { MailRecord } from './entities/mail-record.entity';
import { Owner } from './entities/owner.entity';
import { Package } from './entities/package.entity';
import { Reservation } from './entities/reservation.entity';
import { Resident } from './entities/resident.entity';
import { ResidentialIncidentHistory } from './entities/residential-incident-history.entity';
import { ResidentialIncident } from './entities/residential-incident.entity';
import { ResidentialUnit } from './entities/residential-unit.entity';
import { Tenant } from './entities/tenant.entity';
import { Vehicle } from './entities/vehicle.entity';
import { VirtualLog } from './entities/virtual-log.entity';
import { VisitorParkingHistory } from './entities/visitor-parking-history.entity';
import { VisitorParkingSlot } from './entities/visitor-parking-slot.entity';
import { Visitor } from './entities/visitor.entity';
import { IncidentsService } from './incidents.service';
import { PackagesService } from './packages.service';
import { ReservationsService } from './reservations.service';
import { ResidentialController } from './residential.controller';
import { ResidentialScopeService } from './residential-scope.service';
import { ResidentialService } from './residential.service';
import { VehiclesService } from './vehicles.service';
import { VisitorsService } from './visitors.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ResidentialUnit,
      Resident,
      Owner,
      Tenant,
      Vehicle,
      Visitor,
      VisitorParkingSlot,
      VisitorParkingHistory,
      MailRecord,
      Package,
      Reservation,
      VirtualLog,
      ResidentialIncident,
      ResidentialIncidentHistory,
      UserPost,
      Post,
    ]),
    AuditModule,
    NotificationsModule,
  ],
  controllers: [ResidentialController],
  providers: [
    ResidentialScopeService,
    ResidentialService,
    VisitorsService,
    PackagesService,
    VehiclesService,
    ReservationsService,
    IncidentsService,
  ],
  exports: [
    ResidentialScopeService,
    ResidentialService,
    VisitorsService,
    PackagesService,
    VehiclesService,
    ReservationsService,
    IncidentsService,
  ],
})
export class ResidentialModule {}
