import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PermissionRequirement,
  PermissionOperator,
} from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * 权限守卫 - 基于权限的访问控制
 * 支持 AND/OR 逻辑检查用户权限
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 检查是否为公开路由
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 获取所需的权限
    const permissionRequirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    // 如果没有设置权限要求，允许通过
    if (!permissionRequirement || permissionRequirement.permissions.length === 0) {
      return true;
    }

    // 获取请求和用户信息
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 用户必须已认证
    if (!user) {
      throw new ForbiddenException('用户未认证');
    }

    // 获取用户权限
    const userPermissions = user.permissions || [];
    const requiredPermissions = permissionRequirement.permissions;
    const operator = permissionRequirement.operator || PermissionOperator.AND;

    // 🔧 格式标准化：支持冒号和点号两种格式
    // 数据库存储: 'device:create', 控制器可能使用: 'device.create'
    const normalizePermission = (perm: string) => perm.replace(/[:.]/g, ':');
    const normalizedUserPerms = userPermissions.map(normalizePermission);
    const normalizedRequiredPerms = requiredPermissions.map(normalizePermission);

    // 检查权限
    let hasPermission: boolean;

    if (operator === PermissionOperator.OR) {
      // OR 逻辑：用户拥有任一权限即可
      hasPermission = normalizedRequiredPerms.some((permission) =>
        normalizedUserPerms.includes(permission)
      );
    } else {
      // AND 逻辑：用户必须拥有所有权限
      hasPermission = normalizedRequiredPerms.every((permission) =>
        normalizedUserPerms.includes(permission)
      );
    }

    if (!hasPermission) {
      const operatorText = operator === PermissionOperator.OR ? '任一' : '所有';
      throw new ForbiddenException(
        `需要${operatorText}权限: ${requiredPermissions.join(', ')}。当前用户权限: ${userPermissions.join(', ') || '无'}`
      );
    }

    return true;
  }
}
