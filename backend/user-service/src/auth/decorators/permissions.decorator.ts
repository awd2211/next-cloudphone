import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

export enum PermissionOperator {
  AND = 'AND',
  OR = 'OR',
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
  const permissionArray = Array.isArray(permissions) ? permissions : [permissions];
  const requirement: PermissionRequirement = {
    permissions: permissionArray,
    operator,
  };
  return SetMetadata(PERMISSIONS_KEY, requirement);
};
