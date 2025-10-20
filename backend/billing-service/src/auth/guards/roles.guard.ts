import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      return false;
    }

    // 如果用户有 roles 数组
    if (user.roles && Array.isArray(user.roles)) {
      const userRoles = user.roles.map((r: any) => (typeof r === 'string' ? r : r.name));
      return requiredRoles.some((role) => userRoles.includes(role));
    }

    // 如果用户只有 role 字符串
    if (user.role) {
      return requiredRoles.includes(user.role);
    }

    return false;
  }
}
