import { SetMetadata } from '@nestjs/common';

/**
 * 权限元数据键
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * 权限操作符
 */
export enum PermissionOperator {
  /** 必须拥有所有权限 (默认) */
  AND = 'AND',
  /** 拥有任一权限即可 */
  OR = 'OR',
}

/**
 * 权限要求配置
 */
export interface PermissionRequirement {
  /** 需要的权限列表 */
  permissions: string[];
  /** 权限操作符 (AND/OR) */
  operator: PermissionOperator;
}

/**
 * 权限装饰器
 *
 * 用于声明端点需要的权限
 *
 * @param permissions - 权限列表
 * @param operator - 权限操作符 (AND/OR), 默认为 AND
 *
 * @example
 * ```typescript
 * // 需要所有权限
 * @RequirePermissions('device:read', 'device:write')
 * async updateDevice() { ... }
 *
 * // 需要任一权限
 * @RequirePermissions(['device:read', 'device:view'], PermissionOperator.OR)
 * async viewDevice() { ... }
 * ```
 */
export const RequirePermissions = (
  ...permissions: string[]
): MethodDecorator => {
  return SetMetadata(PERMISSIONS_KEY, {
    permissions,
    operator: PermissionOperator.AND,
  });
};

/**
 * 权限装饰器 (OR 操作)
 *
 * 需要任一权限即可访问
 */
export const RequireAnyPermission = (
  ...permissions: string[]
): MethodDecorator => {
  return SetMetadata(PERMISSIONS_KEY, {
    permissions,
    operator: PermissionOperator.OR,
  });
};

/**
 * 权限装饰器 (单个权限)
 *
 * 简化版,用于只需要一个权限的场景
 */
export const RequirePermission = (permission: string): MethodDecorator => {
  return RequirePermissions(permission);
};
