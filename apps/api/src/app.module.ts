import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from './common/common.module';
import { AssociatesModule } from './modules/associates/associates.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { DocumentalModule } from './modules/documental/documental.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ResidentialModule } from './modules/residential/residential.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PostsModule } from './modules/posts/posts.module';
import { RolesModule } from './modules/roles/roles.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
      ssl:
        process.env.DATABASE_URL?.includes('supabase')
          ? { rejectUnauthorized: false }
          : false,
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    AssociatesModule,
    InventoryModule,
    DeliveriesModule,
    SchedulingModule,
    DocumentalModule,
    ResidentialModule,
    NotificationsModule,
    PostsModule,
    AuditModule,
  ],
})
export class AppModule {}
