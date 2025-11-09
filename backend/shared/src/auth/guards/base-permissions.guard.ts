import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PermissionRequirement,
  PermissionOperator,
} from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * 基础权限守卫
 *
 * 所有微服务的 PermissionsGuard 都应该继承此基类
 * 提供统一的权限检查逻辑
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class PermissionsGuard extends BasePermissionsGuard {
 *   constructor(reflector: Reflector) {
 *     super(reflector);
 *   }
 * }
 * ```
 *
 * 特性:
 * - ✅ 超级管理员自动绕过所有权限检查
 * - ✅ 支持 @Public() 装饰器
 * - ✅ 支持 AND/OR 操作符
 * - ✅ 权限格式标准化 (支持 resource:action 和 resource.action)
 * - ✅ 详细的错误消息
 * - ✅ 兼容多种权限数据结构
 */
@Injectable()
export class BasePermissionsGuard implements CanActivate {
  constructor(protected reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. 检查是否为公开端点
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 2. 获取权限要求
    const permissionRequirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    // 如果没有设置权限要求,默认允许访问
    if (!permissionRequirement || permissionRequirement.permissions.length === 0) {
      return true;
    }

    // 3. 获取用户信息
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('用户未认证');
    }

    // 4. ✅ 超级管理员拥有所有权限,直接放行
    if (user.isSuperAdmin === true) {
      return true;
    }

    // 5. 提取用户权限
    const userPermissions = this.extractPermissions(user);
    const requiredPermissions = permissionRequirement.permissions;
    const operator = permissionRequirement.operator || PermissionOperator.AND;

    // 6. 权限格式标准化 (支持冒号和点号)
    const normalizePermission = (perm: string) => perm.replace(/[:.]/g, ':');
    const normalizedUserPerms = userPermissions.map(normalizePermission);
    const normalizedRequiredPerms = requiredPermissions.map(normalizePermission);

    // 7. 权限检查
    let hasPermission: boolean;

    if (operator === PermissionOperator.OR) {
      // OR: 拥有任一权限即可
      hasPermission = normalizedRequiredPerms.some((permission) =>
        normalizedUserPerms.includes(permission)
      );
    } else {
      // AND: 必须拥有所有权限
      hasPermission = normalizedRequiredPerms.every((permission) =>
        normalizedUserPerms.includes(permission)
      );
    }

    // 8. 如果没有权限,抛出异常
    if (!hasPermission) {
      const operatorText = operator === PermissionOperator.OR ? '任一' : '所有';
      throw new ForbiddenException(`需要${operatorText}权限: ${requiredPermissions.join(', ')}`);
    }

    return true;
  }

  /**
   * 从用户对象中提取权限列表
   *
   * 支持多种数据结构:
   * 1. user.permissions: ['device:read', ...] (扁平化数组)
   * 2. user.roles: [{ permissions: [...] }] (层级结构)
   *
   * @param user - 用户对象
   * @returns 权限字符串数组
   */
  protected extractPermissions(user: any): string[] {
    // 方式1: 扁平化权限数组 (推荐,性能最好)
    if (user.permissions && Array.isArray(user.permissions)) {
      return user.permissions;
    }

    // 方式2: 从角色中提取权限 (兼容 User Service)
    if (user.roles && Array.isArray(user.roles)) {
      const permissions = new Set<string>();

      for (const role of user.roles) {
        if (role.permissions && Array.isArray(role.permissions)) {
          for (const permission of role.permissions) {
            // 支持字符串格式: 'device:read'
            if (typeof permission === 'string') {
              permissions.add(permission);
            }
            // 支持对象格式: { resource: 'device', action: 'read' }
            else if (permission.resource && permission.action) {
              permissions.add(`${permission.resource}:${permission.action}`);
            }
          }
        }
      }

      return Array.from(permissions);
    }

    return [];
  }

  /**
   * 可选的自定义权限检查逻辑
   *
   * 子类可以重写此方法以添加额外的权限检查逻辑
   * 例如: 数据范围权限、字段级权限等
   */
  protected async additionalPermissionCheck?(
    user: any,
    requiredPermissions: string[],
    context: ExecutionContext
  ): Promise<boolean>;
}
