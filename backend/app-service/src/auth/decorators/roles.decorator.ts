import { SetMetadata } from '@nestjs/common';

/**
 * 角色装饰器元数据键
 */
export const ROLES_KEY = 'roles';

/**
 * 角色装饰器
 *
 * 用于标记端点需要的角色
 *
 * @param roles - 允许访问的角色列表
 *
 * @example
 * ```typescript
 * @Roles('admin', 'super_admin')
 * @Get('admin-only')
 * async adminRoute() {
 *   // 只有 admin 或 super_admin 可以访问
 * }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
