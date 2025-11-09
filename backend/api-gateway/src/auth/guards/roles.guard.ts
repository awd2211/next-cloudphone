import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * 角色守卫 - 基于角色的访问控制
 * 检查用户是否拥有所需的角色
 */
@Injectable()
export class RolesGuard implements CanActivate {
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

    // 获取所需的角色
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 如果没有设置角色要求，允许通过
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 获取请求和用户信息
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 用户必须已认证
    if (!user) {
      throw new ForbiddenException('用户未认证');
    }

    // 检查用户角色
    const userRoles = user.roles || [];

    // ✅ superadmin 像 root 一样拥有所有权限
    if (userRoles.includes('super_admin')) {
      return true;
    }

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `需要以下角色之一: ${requiredRoles.join(', ')}。当前用户角色: ${userRoles.join(', ') || '无'}`
      );
    }

    return true;
  }
}
