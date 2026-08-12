import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './common/common.module';
import { AssociatesModule } from './modules/associates/associates.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { DocumentalModule } from './modules/documental/documental.module';
import { HrAbsenteeismModule } from './modules/hr-absenteeism/hr-absenteeism.module';
import { HrAlertsModule } from './modules/hr-alerts/hr-alerts.module';
import { HrCatalogsModule } from './modules/hr-catalogs/hr-catalogs.module';
import { HrDashboardModule } from './modules/hr-dashboard/hr-dashboard.module';
import { HrDocumentsModule } from './modules/hr-documents/hr-documents.module';
import { HrExcelModule } from './modules/hr-excel/hr-excel.module';
import { HrPositionsModule } from './modules/hr-positions/hr-positions.module';
import { HrRetirementsModule } from './modules/hr-retirements/hr-retirements.module';
import { HrWorkCentersModule } from './modules/hr-work-centers/hr-work-centers.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PostsModule } from './modules/posts/posts.module';
import { PostEquipmentModule } from './modules/post-equipment/post-equipment.module';
import { ReceptionModule } from './modules/reception/reception.module';
import { RolesModule } from './modules/roles/roles.module';
import { SstModule } from './modules/sst/sst.module';
import { VigiaModule } from './modules/vigia/vigia.module';
import { MinutaModule } from './modules/minuta/minuta.module';
import { UsersModule } from './modules/users/users.module';

function isSupabaseDatabaseUrl(url?: string): boolean {
  if (!url) return false;
  return url.includes('supabase') || url.includes('pooler');
}
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    CommonModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
      ssl: isSupabaseDatabaseUrl(process.env.DATABASE_URL)
        ? { rejectUnauthorized: false }
        : false,
      // Pool del driver pg. En Supabase (session pooler) el tope real es bajo
      // (~15); varias instancias Nest + Promise.all lo saturan (EMAXCONNSESSION).
      extra: {
        max: Number(
          process.env.DB_POOL_MAX ??
            (isSupabaseDatabaseUrl(process.env.DATABASE_URL) ? 5 : 20),
        ),
        connectionTimeoutMillis: Number(process.env.DB_CONN_TIMEOUT_MS ?? 10000),
        idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS ?? 30000),
        keepAlive: true,
      },
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    HrCatalogsModule,
    HrPositionsModule,
    HrWorkCentersModule,
    AssociatesModule,
    HrDocumentsModule,
    HrRetirementsModule,
    HrAlertsModule,
    HrDashboardModule,
    HrExcelModule,
    HrAbsenteeismModule,
    InventoryModule,
    DeliveriesModule,
    SchedulingModule,
    DocumentalModule,
    NotificationsModule,
    PostsModule,
    PostEquipmentModule,
    ReceptionModule,
    SstModule,
    VigiaModule,
    MinutaModule,
    AuditModule,
  ],
})
export class AppModule {}
