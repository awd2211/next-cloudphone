import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * 角色守卫
 *
 * 用于基于角色的访问控制
 * 必须在 JwtAuthGuard 之后执行（依赖 request.user）
 *
 * 使用方法：
 * ```typescript
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('admin', 'super_admin')
 * @Get('admin-only')
 * async adminRoute() { ... }
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

    // 获取所需角色
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

    // super_admin 拥有所有权限
    const userRoles = this.extractRoles(user);
    if (userRoles.includes('super_admin')) {
      return true;
    }

    // 检查用户是否拥有所需角色之一
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(`需要以下角色之一: ${requiredRoles.join(', ')}`);
    }

    return true;
  }

  /**
   * 提取用户角色
   * @param user - 用户对象
   * @returns 角色名称数组
   */
  private extractRoles(user: any): string[] {
    if (user.roles && Array.isArray(user.roles)) {
      return user.roles.map((role: any) => {
        if (typeof role === 'string') {
          return role;
        }
        return role.name || role.code || '';
      }).filter(Boolean);
    }

    // 兼容单一角色格式
    if (user.role) {
      if (typeof user.role === 'string') {
        return [user.role];
      }
      return [user.role.name || user.role.code || ''];
    }

    return [];
  }
}
