import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Permission } from '../entities/permission.entity';
import { DataScope } from '../entities/data-scope.entity';
import { FieldPermission } from '../entities/field-permission.entity';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Menu } from '../entities/menu.entity';
import { Department } from '../entities/department.entity';
import { Tenant } from '../entities/tenant.entity';
import { AuditLog } from '../entities/audit-log.entity';

// Modules
import { CacheModule } from '../cache/cache.module';

// Controllers
import { PermissionsController } from './permissions.controller';
import { DataScopeController } from './controllers/data-scope.controller';
// import { DataScopesController } from './controllers/data-scopes.controller'; // 简化版，已弃用
import { FieldPermissionController } from './controllers/field-permission.controller';
import { MenuPermissionController } from './controllers/menu-permission.controller';

// Services
import { PermissionsService } from './permissions.service';
import { PermissionCheckerService } from './permission-checker.service';
import { DataScopeService } from './data-scope.service';
import { FieldFilterService } from './field-filter.service';
import { TenantIsolationService } from './tenant-isolation.service';
import { PermissionCacheService } from './permission-cache.service';
import { MenuPermissionService } from './menu-permission.service';
import { AlertService } from '../common/services/alert/alert.service';

// Gateway
import { PermissionGateway } from './permission.gateway';

/**
 * 权限模块
 * 提供企业级 RBAC 权限管理功能
 *
 * 功能特性：
 * - 4 层权限控制：功能、操作、数据、字段
 * - 多租户隔离
 * - 数据范围控制
 * - 字段级权限
 * - Redis 双层缓存
 * - 菜单权限
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Permission,
      DataScope,
      FieldPermission,
      User,
      Role,
      Menu,
      Department,
      Tenant,
      AuditLog,
    ]),
    CacheModule, // 导入缓存模块
  ],
  controllers: [
    PermissionsController,
    DataScopeController,
    // DataScopesController, // 简化版，已弃用
    FieldPermissionController,
    MenuPermissionController,
  ],
  providers: [
    PermissionsService,
    PermissionCheckerService,
    DataScopeService,
    FieldFilterService,
    TenantIsolationService,
    PermissionCacheService,
    MenuPermissionService,
    AlertService,
    PermissionGateway, // ✅ WebSocket Gateway for real-time permission updates
  ],
  exports: [
    PermissionsService,
    PermissionCheckerService,
    DataScopeService,
    FieldFilterService,
    TenantIsolationService,
    PermissionCacheService,
    MenuPermissionService,
    PermissionGateway, // ✅ Export gateway for use in other modules
  ],
})
export class PermissionsModule {}
