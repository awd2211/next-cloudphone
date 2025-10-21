import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * 角色装饰器 - 声明接口所需的角色
 * @param roles 角色名称数组
 * @example
 * @RequireRole('admin', 'manager')
 * @Get('users')
 * async getUsers() {}
 */
export const RequireRole = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Roles 装饰器 - RequireRole 的别名
 */
export const Roles = RequireRole;
