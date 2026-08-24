import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PermissionsModule } from '../modules/permissions/permissions.module';
import { PermissionsGuard } from './guards/permissions.guard';
import { TenantInterceptor } from './tenant/tenant.interceptor';
import { TenantInsertSubscriber } from './tenant/tenant-insert.subscriber';

@Global()
@Module({
  imports: [PermissionsModule],
  providers: [
    PermissionsGuard,
    TenantInsertSubscriber,
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
  exports: [PermissionsGuard, PermissionsModule],
})
export class CommonModule {}
