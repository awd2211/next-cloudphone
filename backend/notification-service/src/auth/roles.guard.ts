import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * 角色守卫
 *
 * 用于基于角色的访问控制（RBAC）
 *
 * 使用方法：
 * ```typescript
 * @Roles('admin', 'template-manager')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Post()
 * async adminOnly() { ... }
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 获取方法和类上的 @Roles 装饰器参数
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      // 没有角色要求，允许访问
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('未认证的用户');
    }

    if (!user.roles || !Array.isArray(user.roles)) {
      throw new ForbiddenException('用户没有角色信息');
    }

    // 检查用户是否拥有所需角色之一
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(`需要以下角色之一: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
