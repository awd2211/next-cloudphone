import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export enum PermissionOperator {
  AND = 'AND', // 需要所有权限
  OR = 'OR',   // 需要任一权限
}

export interface PermissionRequirement {
  permissions: string[];
  operator?: PermissionOperator;
}

/**
 * 权限装饰器 - 声明接口所需的权限
 * @param permissions 权限字符串数组
 * @param operator 权限运算符 (AND 或 OR，默认 AND)
 * @example
 * // 需要所有权限
 * @RequirePermission(['users.read', 'users.write'])
 * @Get('users')
 * async getUsers() {}
 *
 * // 需要任一权限
 * @RequirePermission(['admin.full', 'users.manage'], PermissionOperator.OR)
 * @Post('users')
 * async createUser() {}
 */
export const RequirePermission = (
  permissions: string | string[],
  operator: PermissionOperator = PermissionOperator.AND,
) => {
  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
  const requirement: PermissionRequirement = {
    permissions: permissionArray,
    operator,
  };
  return SetMetadata(PERMISSIONS_KEY, requirement);
};

/**
 * 需要任一权限
 * @param permissions 权限字符串数组
 */
export const RequireAnyPermission = (...permissions: string[]) =>
  RequirePermission(permissions, PermissionOperator.OR);

/**
 * 需要所有权限
 * @param permissions 权限字符串数组
 */
export const RequireAllPermissions = (...permissions: string[]) =>
  RequirePermission(permissions, PermissionOperator.AND);
