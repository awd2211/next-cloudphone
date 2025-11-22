import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('用户未认证');
    }

    // ✅ 支持两种 roles 格式：字符串数组 ['admin'] 或对象数组 [{name: 'admin'}]
    const userRoles = this.extractRoles(user);

    this.logger.debug(`RolesGuard: user=${user.username}, requiredRoles=${JSON.stringify(requiredRoles)}, userRoles=${JSON.stringify(userRoles)}, isSuperAdmin=${user.isSuperAdmin}`);

    // ✅ super_admin 拥有所有权限 (检查 isSuperAdmin 标志或 roles 数组)
    if (user.isSuperAdmin === true || userRoles.includes('super_admin')) {
      this.logger.debug(`RolesGuard: super_admin bypass for ${user.username}`);
      return true;
    }

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      this.logger.warn(`RolesGuard: Access denied for ${user.username}, required=${requiredRoles.join(', ')}, has=${userRoles.join(', ')}`);
      throw new ForbiddenException(`需要以下角色之一: ${requiredRoles.join(', ')}`);
    }

    return true;
  }

  /**
   * 从用户对象中提取角色列表
   * 支持多种数据结构：
   * - user.roles: [{ name: 'admin' }, { name: 'user' }]
   * - user.roles: ['admin', 'user']
   * - user.role: 'admin'
   */
  private extractRoles(user: any): string[] {
    // 如果用户有 roles 数组
    if (user.roles && Array.isArray(user.roles)) {
      return user.roles.map((r: any) => (typeof r === 'string' ? r : r.name));
    }

    // 如果用户有单个 role 字符串
    if (user.role && typeof user.role === 'string') {
      return [user.role];
    }

    return [];
  }
}
