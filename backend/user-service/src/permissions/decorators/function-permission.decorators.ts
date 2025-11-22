import { SetMetadata } from '@nestjs/common';
import {
  PERMISSIONS_KEY,
  REQUIRE_ALL_PERMISSIONS_KEY,
  ALLOW_CROSS_TENANT_KEY,
  REQUIRE_SUPER_ADMIN_KEY,
  SKIP_PERMISSION_KEY,
} from '../guards/permissions.guard';

/**
 * 要求特定权限
 * @param permissions 权限列表
 *
 * @example
 * @RequirePermissions('user:create', 'user:update')
 * async createUser() { ... }
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * 要求拥有所有指定权限（默认只需要任意一个）
 *
 * @example
 * @RequirePermissions('user:create', 'user:update')
 * @RequireAllPermissions()
 * async createUser() { ... }
 */
export const RequireAllPermissions = () => SetMetadata(REQUIRE_ALL_PERMISSIONS_KEY, true);

/**
 * 允许跨租户访问
 *
 * @example
 * @AllowCrossTenant()
 * @RequirePermissions('admin:view')
 * async viewAllTenants() { ... }
 */
export const AllowCrossTenant = () => SetMetadata(ALLOW_CROSS_TENANT_KEY, true);

/**
 * 要求超级管理员权限
 *
 * @example
 * @RequireSuperAdmin()
 * async deleteAllUsers() { ... }
 */
export const RequireSuperAdmin = () => SetMetadata(REQUIRE_SUPER_ADMIN_KEY, true);

/**
 * 跳过权限检查
 * 用于公开接口或已在其他地方验证权限的接口
 *
 * @example
 * @SkipPermission()
 * async publicApi() { ... }
 */
export const SkipPermission = () => SetMetadata(SKIP_PERMISSION_KEY, true);

/**
 * 组合装饰器：公开接口（跳过所有权限检查）
 *
 * @example
 * @PublicApi()
 * async login() { ... }
 */
export const PublicApi = () => SkipPermission();

/**
 * 组合装饰器：管理员接口（需要管理员权限）
 *
 * @example
 * @AdminOnly()
 * async systemSettings() { ... }
 */
export const AdminOnly = () => RequirePermissions('admin:access');

/**
 * 组合装饰器：超级管理员接口（需要超级管理员权限）
 *
 * @example
 * @SuperAdminOnly()
 * async dangerousOperation() { ... }
 */
export const SuperAdminOnly = () => RequireSuperAdmin();
