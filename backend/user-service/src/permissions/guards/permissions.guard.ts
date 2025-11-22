import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionCheckerService } from '../permission-checker.service';
import { TenantIsolationService } from '../tenant-isolation.service';

/**
 * 权限元数据键
 */
export const PERMISSIONS_KEY = 'permissions';
export const REQUIRE_ALL_PERMISSIONS_KEY = 'requireAllPermissions';
export const ALLOW_CROSS_TENANT_KEY = 'allowCrossTenant';
export const REQUIRE_SUPER_ADMIN_KEY = 'requireSuperAdmin';
export const SKIP_PERMISSION_KEY = 'skipPermission';

/**
 * 权限守卫
 * 整合功能权限、跨租户控制、超级管理员检查
 *
 * 使用方式：
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @RequirePermissions('user:create')
 * @Controller('users')
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private permissionChecker: PermissionCheckerService,
    private tenantIsolation: TenantIsolationService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查是否跳过权限验证
    const skipPermission = this.reflector.getAllAndOverride<boolean>(SKIP_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipPermission) {
      return true;
    }

    // 获取请求对象
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 如果没有用户信息，拒绝访问（应该先通过 AuthGuard）
    if (!user || !user.id) {
      this.logger.warn('未找到用户信息，拒绝访问');
      throw new ForbiddenException('未认证');
    }

    // 检查是否需要超级管理员权限
    const requireSuperAdmin = this.reflector.getAllAndOverride<boolean>(REQUIRE_SUPER_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requireSuperAdmin) {
      const isSuperAdmin = await this.tenantIsolation.isSuperAdmin(user.id);
      if (!isSuperAdmin) {
        this.logger.warn(`用户 ${user.id} 尝试访问需要超级管理员权限的资源`);
        throw new ForbiddenException('需要超级管理员权限');
      }
      return true; // 超级管理员通过所有权限检查
    }

    // 获取所需权限
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 如果没有配置权限要求，允许访问
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 检查是否需要所有权限
    const requireAll = this.reflector.getAllAndOverride<boolean>(REQUIRE_ALL_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 执行权限检查
    let hasPermission = false;

    if (requireAll) {
      // 需要拥有所有权限
      hasPermission = await this.permissionChecker.hasAllPermissions(user.id, requiredPermissions);
    } else {
      // 只需要拥有任意一个权限
      hasPermission = await this.permissionChecker.hasAnyPermission(user.id, requiredPermissions);
    }

    if (!hasPermission) {
      this.logger.warn(`用户 ${user.id} 缺少必需的权限: ${requiredPermissions.join(', ')}`);
      throw new ForbiddenException('权限不足');
    }

    // 检查跨租户访问权限
    const allowCrossTenant = this.reflector.getAllAndOverride<boolean>(ALLOW_CROSS_TENANT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!allowCrossTenant) {
      // 不允许跨租户访问，验证请求参数中的 tenantId
      const targetTenantId = this.extractTenantId(request);

      if (targetTenantId) {
        const canAccess = await this.tenantIsolation.checkCrossTenantAccess(
          user.id,
          targetTenantId
        );

        if (!canAccess) {
          this.logger.warn(`用户 ${user.id} 尝试跨租户访问: ${targetTenantId}`);
          throw new ForbiddenException('不允许跨租户访问');
        }
      }
    }

    // 将用户租户ID附加到请求对象，供后续使用
    request.userTenantId = await this.tenantIsolation.getUserTenantId(user.id);

    return true;
  }

  /**
   * 从请求中提取目标租户ID
   * 优先级：body.tenantId > params.tenantId > query.tenantId
   */
  private extractTenantId(request: any): string | null {
    return request.body?.tenantId || request.params?.tenantId || request.query?.tenantId || null;
  }
}
