import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PermissionsModule } from '../modules/permissions/permissions.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { MemoryMonitorService } from './monitoring/memory-monitor.service';
import { MemoryProfileInterceptor } from './monitoring/memory-profile.interceptor';
import { TenantInterceptor } from './tenant/tenant.interceptor';
import { TenantInsertSubscriber } from './tenant/tenant-insert.subscriber';

@Global()
@Module({
  imports: [PermissionsModule],
  providers: [
    PermissionsGuard,
    JwtAuthGuard,
    TenantInsertSubscriber,
    MemoryMonitorService,
    // Va antes que TenantInterceptor para medir la petición completa,
    // incluida la transacción que aquel abre y cierra.
    { provide: APP_INTERCEPTOR, useClass: MemoryProfileInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [PermissionsGuard, PermissionsModule, JwtAuthGuard],
})
export class CommonModule {}
