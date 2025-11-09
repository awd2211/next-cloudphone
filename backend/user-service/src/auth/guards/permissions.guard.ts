import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject, forwardRef, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PermissionRequirement,
  PermissionOperator,
} from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { MenuPermissionService } from '../../permissions/menu-permission.service';

// 导入 SKIP_PERMISSION_KEY
const SKIP_PERMISSION_KEY = 'skipPermission';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    @Inject(forwardRef(() => MenuPermissionService))
    private menuPermissionService: MenuPermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // 检查是否跳过权限验证
    const skipPermission = this.reflector.getAllAndOverride<boolean>(SKIP_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipPermission) {
      this.logger.debug('端点使用 @SkipPermission 装饰器,跳过权限检查');
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

    // ✅ JWT Token 优化：超级管理员拥有所有权限
    if (user.isSuperAdmin === true) {
      this.logger.debug(`超级管理员 ${user.username} 自动通过权限检查`);
      return true;
    }

    // ✅ JWT Token 优化：从数据库实时查询用户权限（支持所有17个角色）
    let userPermissions: string[] = [];
    try {
      userPermissions = await this.menuPermissionService.getUserPermissionNames(user.sub);
      this.logger.debug(`用户 ${user.username} 拥有 ${userPermissions.length} 个权限`);
    } catch (error) {
      this.logger.error(`查询用户 ${user.username} 权限失败: ${error.message}`);
      // 查询失败时，为了安全拒绝访问
      throw new ForbiddenException('无法验证用户权限');
    }
    const requiredPermissions = permissionRequirement.permissions;
    const operator = permissionRequirement.operator || PermissionOperator.AND;

    // 🌟 通配符权限检查：超级管理员拥有 ['*'] 表示所有权限
    if (userPermissions.includes('*')) {
      this.logger.debug(`用户 ${user.username} 拥有通配符权限，通过检查`);
      return true;
    }

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

  private extractPermissions(roles: any[]): string[] {
    if (!roles || roles.length === 0) {
      return [];
    }

    const permissions = new Set<string>();

    for (const role of roles) {
      if (role.permissions && Array.isArray(role.permissions)) {
        for (const permission of role.permissions) {
          // 🔧 统一使用冒号格式，与数据库存储格式一致
          const permissionString = `${permission.resource}:${permission.action}`;
          permissions.add(permissionString);
        }
      }
    }

    return Array.from(permissions);
  }
}
