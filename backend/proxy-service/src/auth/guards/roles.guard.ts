import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * 角色守卫
 *
 * 用于基于角色的访问控制（RBAC）
 * 支持 @Public() 装饰器跳过验证
 * super_admin 拥有所有权限
 *
 * 使用方法：
 * ```typescript
 * @Roles('admin', 'proxy-manager')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Post()
 * async createProxy() { ... }
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 检查是否标记为公开端点
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

    // 提取用户角色（支持多种数据结构）
    const userRoles = this.extractRoles(user);

    // ✅ super_admin 拥有所有权限
    if (userRoles.includes('super_admin')) {
      return true;
    }

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
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

    // 如果用户只有 role 字符串
    if (user.role) {
      return [user.role];
    }

    return [];
  }
}
