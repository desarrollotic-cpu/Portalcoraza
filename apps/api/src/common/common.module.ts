import { Global, Module } from '@nestjs/common';
import { PermissionsModule } from '../modules/permissions/permissions.module';
import { PermissionsGuard } from './guards/permissions.guard';

@Global()
@Module({
  imports: [PermissionsModule],
  providers: [PermissionsGuard],
  exports: [PermissionsGuard],
})
export class CommonModule {}
