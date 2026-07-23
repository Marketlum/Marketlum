import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role, RolePermission } from './entities/role.entity';
import { PermissionsService } from './permissions.service';
import { PermissionCheckService } from '../auth/permission-check.service';

// Global so AdminGuard/SessionGuard (instantiated per controller module,
// including plugin modules) can always resolve the permission services.
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Role, RolePermission])],
  providers: [PermissionsService, PermissionCheckService],
  exports: [PermissionsService, PermissionCheckService],
})
export class PermissionsModule {}
