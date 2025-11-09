import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSIONS_KEY,
  PermissionRequirement,
  PermissionOperator,
} from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Logger } from '@nestjs/common';

// 导入 SKIP_PERMISSION_KEY
const SKIP_PERMISSION_KEY = 'skipPermission';

/**
 * 权限守卫 - 基于权限的访问控制
 * 支持 AND/OR 逻辑检查用户权限
 *
 * ✅ JWT Token 优化后，不再从 Token 读取 permissions
 * 改为从 User Service 实时查询用户权限
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    private reflector: Reflector,
    private httpService: HttpService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查是否为公开路由
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
      this.logger.debug('[API Gateway] 端点使用 @SkipPermission 装饰器,跳过权限检查');
      return true;
    }

    // 获取所需的权限
    const permissionRequirement = this.reflector.getAllAndOverride<PermissionRequirement>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    // 如果没有设置权限要求，允许通过
    if (!permissionRequirement || permissionRequirement.permissions.length === 0) {
      return true;
    }

    // 获取请求和用户信息
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 用户必须已认证
    if (!user || !user.sub) {
      throw new ForbiddenException('用户未认证');
    }

    // ✅ 超级管理员拥有所有权限
    if (user.isSuperAdmin === true) {
      this.logger.debug(`超级管理员 ${user.username} 自动通过权限检查`);
      return true;
    }

    // ✅ JWT Token 优化：从 User Service 实时查询用户权限
    // TODO: 添加权限缓存以提高性能
    let userPermissions: string[] = [];
    try {
      const userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:30001';
      const response = await firstValueFrom(
        this.httpService.get(
          `${userServiceUrl}/menu-permissions/user/${user.sub}/permissions`,
          {
            headers: {
              Authorization: request.headers.authorization,
            },
            timeout: 3000, // 3秒超时
          }
        )
      );

      // 解析响应数据
      if (response.data?.success && Array.isArray(response.data.data)) {
        userPermissions = response.data.data;
        this.logger.debug(`用户 ${user.username} 拥有 ${userPermissions.length} 个权限`);
      } else {
        this.logger.warn(`用户 ${user.username} 权限数据格式异常:`, response.data);
        userPermissions = [];
      }
    } catch (error) {
      this.logger.error(`查询用户 ${user.username} 权限失败: ${error.message}`);
      // 如果查询失败，拒绝访问（安全第一）
      throw new ForbiddenException('无法验证用户权限，请稍后重试');
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

    // 检查权限
    let hasPermission: boolean;

    if (operator === PermissionOperator.OR) {
      // OR 逻辑：用户拥有任一权限即可
      hasPermission = normalizedRequiredPerms.some((permission) =>
        normalizedUserPerms.includes(permission)
      );
    } else {
      // AND 逻辑：用户必须拥有所有权限
      hasPermission = normalizedRequiredPerms.every((permission) =>
        normalizedUserPerms.includes(permission)
      );
    }

    if (!hasPermission) {
      const operatorText = operator === PermissionOperator.OR ? '任一' : '所有';
      throw new ForbiddenException(
        `需要${operatorText}权限: ${requiredPermissions.join(', ')}`
      );
    }

    return true;
  }
}
