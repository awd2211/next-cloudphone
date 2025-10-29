import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "permissions";

export enum PermissionOperator {
  AND = "AND",
  OR = "OR",
}

export interface PermissionRequirement {
  permissions: string[];
  operator?: PermissionOperator;
}

/**
 * 权限装饰器 - 声明接口所需的权限
 */
export const RequirePermission = (
  permissions: string | string[],
  operator: PermissionOperator = PermissionOperator.AND,
) => {
  const permissionArray = Array.isArray(permissions)
    ? permissions
    : [permissions];
  const requirement: PermissionRequirement = {
    permissions: permissionArray,
    operator,
  };
  return SetMetadata(PERMISSIONS_KEY, requirement);
};

/**
 * 便捷方法：要求任一权限（OR 操作）
 */
export const RequireAnyPermission = (...permissions: string[]) =>
  RequirePermission(permissions, PermissionOperator.OR);

/**
 * 便捷方法：要求所有权限（AND 操作）
 */
export const RequireAllPermissions = (...permissions: string[]) =>
  RequirePermission(permissions, PermissionOperator.AND);
