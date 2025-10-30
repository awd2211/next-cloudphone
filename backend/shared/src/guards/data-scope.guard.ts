import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DATA_SCOPE_KEY, DataScopeConfig, DataScopeType } from '../decorators/data-scope.decorator';
import { hasAdminRole, isSuperAdmin } from '../constants/roles';

/**
 * 数据范围守卫
 *
 * 自动过滤数据访问权限：
 * - 超级管理员和管理员可以访问所有数据
 * - 普通用户只能访问自己的数据或同租户的数据
 *
 * 使用方式：
 * @UseGuards(JwtAuthGuard, DataScopeGuard)
 * @DataScope({ type: DataScopeType.SELF })
 * @Get(':id')
 * async findOne(@Param('id') id: string) {}
 */
@Injectable()
export class DataScopeGuard implements CanActivate {
  private readonly logger = new Logger(DataScopeGuard.name);

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 获取数据范围配置
    const dataScopeConfig = this.reflector.getAllAndOverride<DataScopeConfig>(
      DATA_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有配置数据范围，允许访问
    if (!dataScopeConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 如果没有用户信息，拒绝访问
    if (!user || !user.id) {
      this.logger.warn('DataScopeGuard: 未找到用户信息');
      throw new ForbiddenException('未认证');
    }

    // 超级管理员可以访问所有数据
    if (isSuperAdmin(user.roles || [])) {
      this.logger.debug(`超级管理员 ${user.id} 访问资源，跳过数据范围检查`);
      return true;
    }

    // 管理员根据数据范围类型决定
    const isAdmin = hasAdminRole(user.roles || []);

    switch (dataScopeConfig.type) {
      case DataScopeType.ALL:
        // 所有数据 - 只有管理员可访问
        if (!isAdmin) {
          this.logger.warn(`用户 ${user.id} 尝试访问需要管理员权限的资源`);
          throw new ForbiddenException(
            dataScopeConfig.errorMessage || '需要管理员权限',
          );
        }
        return true;

      case DataScopeType.TENANT:
        // 租户数据 - 管理员可访问所有，普通用户只能访问同租户
        return this.checkTenantScope(request, user, dataScopeConfig, isAdmin);

      case DataScopeType.SELF:
        // 个人数据 - 管理员可访问所有，普通用户只能访问自己的
        return this.checkSelfScope(request, user, dataScopeConfig, isAdmin);

      case DataScopeType.CUSTOM:
        // 自定义 - 使用自定义过滤函数
        return this.checkCustomScope(request, user, dataScopeConfig, isAdmin);

      default:
        this.logger.warn(`未知的数据范围类型: ${dataScopeConfig.type}`);
        return true;
    }
  }

  /**
   * 检查租户范围
   */
  private checkTenantScope(
    request: any,
    user: any,
    config: DataScopeConfig,
    isAdmin: boolean,
  ): boolean {
    // 管理员可以访问所有租户数据
    if (isAdmin) {
      return true;
    }

    // 从请求中提取目标租户ID
    const targetTenantId = this.extractTenantId(request, config);

    // 如果没有指定租户ID，允许访问（后续由业务逻辑过滤）
    if (!targetTenantId) {
      this.logger.debug('未指定租户ID，允许访问');
      return true;
    }

    // 检查用户租户ID
    const userTenantId = user.tenantId;

    if (targetTenantId !== userTenantId) {
      this.logger.warn(
        `用户 ${user.id}(租户:${userTenantId}) 尝试访问其他租户(${targetTenantId})的资源`,
      );
      throw new ForbiddenException(
        config.errorMessage || '您没有权限访问其他租户的资源',
      );
    }

    return true;
  }

  /**
   * 检查个人范围
   */
  private checkSelfScope(
    request: any,
    user: any,
    config: DataScopeConfig,
    isAdmin: boolean,
  ): boolean {
    // 管理员可以访问所有用户数据
    if (isAdmin) {
      return true;
    }

    // 从请求中提取资源所有者ID
    const resourceOwnerId = this.extractOwnerId(request, config);

    // 如果没有指定所有者ID，允许访问（后续由业务逻辑过滤）
    if (!resourceOwnerId) {
      this.logger.debug('未指定资源所有者ID，允许访问');
      return true;
    }

    // 检查是否为用户自己的资源
    if (resourceOwnerId !== user.id) {
      this.logger.warn(
        `用户 ${user.id} 尝试访问其他用户(${resourceOwnerId})的资源`,
      );
      throw new ForbiddenException(
        config.errorMessage || '您只能访问自己的资源',
      );
    }

    return true;
  }

  /**
   * 检查自定义范围
   */
  private checkCustomScope(
    request: any,
    user: any,
    config: DataScopeConfig,
    isAdmin: boolean,
  ): boolean {
    // 管理员可以访问所有数据
    if (isAdmin) {
      return true;
    }

    // 如果没有自定义过滤函数，拒绝访问
    if (!config.customFilter) {
      this.logger.error('自定义数据范围未提供过滤函数');
      throw new ForbiddenException('数据范围配置错误');
    }

    // 执行自定义过滤
    const resource = { ...request.params, ...request.query, ...request.body };
    const hasAccess = config.customFilter(user, resource);

    if (!hasAccess) {
      this.logger.warn(`用户 ${user.id} 未通过自定义数据范围检查`);
      throw new ForbiddenException(
        config.errorMessage || '您没有权限访问此资源',
      );
    }

    return true;
  }

  /**
   * 从请求中提取租户ID
   * 优先级: params > query > body > user.tenantId
   */
  private extractTenantId(request: any, config: DataScopeConfig): string | null {
    const field = config.tenantField || 'tenantId';

    return (
      request.params?.[field] ||
      request.query?.[field] ||
      request.body?.[field] ||
      null
    );
  }

  /**
   * 从请求中提取资源所有者ID
   * 优先级: params.id > params.userId > query.userId > body.userId
   */
  private extractOwnerId(request: any, config: DataScopeConfig): string | null {
    const field = config.ownerField || 'userId';

    // 特殊处理: 如果路由参数是 :id，先检查是否为用户ID
    // 例如: GET /users/:id, GET /devices/:id
    const paramId = request.params?.id;
    if (paramId) {
      return paramId;
    }

    return (
      request.params?.[field] ||
      request.query?.[field] ||
      request.body?.[field] ||
      null
    );
  }
}
