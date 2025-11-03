import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PermissionRequirement,
  PermissionOperator,
} from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const permissionRequirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!permissionRequirement || permissionRequirement.permissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('用户未认证');
    }

    // 从用户对象中获取权限
    const userPermissions = user.permissions || [];
    const requiredPermissions = permissionRequirement.permissions;
    const operator = permissionRequirement.operator || PermissionOperator.AND;

    // 🔧 格式标准化：支持冒号和点号两种格式
    // 数据库存储: 'device:create', 控制器可能使用: 'device.create'
    const normalizePermission = (perm: string) => perm.replace(/[:.]/g, ':');
    const normalizedUserPerms = userPermissions.map(normalizePermission);
    const normalizedRequiredPerms = requiredPermissions.map(normalizePermission);

    let hasPermission: boolean;

    if (operator === PermissionOperator.OR) {
      hasPermission = normalizedRequiredPerms.some((permission) =>
        normalizedUserPerms.includes(permission)
      );
    } else {
      hasPermission = normalizedRequiredPerms.every((permission) =>
        normalizedUserPerms.includes(permission)
      );
    }

    if (!hasPermission) {
      const operatorText = operator === PermissionOperator.OR ? '任一' : '所有';
      throw new ForbiddenException(`需要${operatorText}权限: ${requiredPermissions.join(', ')}`);
    }

    return true;
  }
}
