import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { TenantIsolationService } from '../tenant-isolation.service';

/**
 * 租户隔离元数据键
 */
export const SKIP_TENANT_ISOLATION_KEY = 'skipTenantIsolation';
export const TENANT_FIELD_KEY = 'tenantField';
export const AUTO_SET_TENANT_KEY = 'autoSetTenant';

/**
 * 租户拦截器
 * 自动应用租户隔离和验证
 *
 * 使用方式：
 * @UseInterceptors(TenantInterceptor)
 * @AutoSetTenant()
 * async createDevice(@Body() dto: CreateDeviceDto) {
 *   // dto.tenantId 会被自动设置为当前用户的租户ID
 * }
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantInterceptor.name);

  constructor(
    private reflector: Reflector,
    private tenantIsolation: TenantIsolationService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // 检查是否跳过租户隔离
    const skipTenantIsolation = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_ISOLATION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTenantIsolation) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 如果没有用户信息，跳过
    if (!user || !user.id) {
      return next.handle();
    }

    // 获取租户字段名
    const tenantField = this.reflector.getAllAndOverride<string>(
      TENANT_FIELD_KEY,
      [context.getHandler(), context.getClass()],
    ) || 'tenantId';

    // 检查是否需要自动设置租户ID
    const autoSetTenant = this.reflector.getAllAndOverride<boolean>(
      AUTO_SET_TENANT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 处理请求体（POST/PUT/PATCH）
    if (request.body && typeof request.body === 'object') {
      if (autoSetTenant) {
        // 自动设置租户ID
        try {
          if (Array.isArray(request.body)) {
            request.body = await this.tenantIsolation.setDataArrayTenant(
              user.id,
              request.body,
              tenantField,
            );
          } else {
            request.body = await this.tenantIsolation.setDataTenant(
              user.id,
              request.body,
              tenantField,
            );
          }
          this.logger.debug(
            `已为用户 ${user.id} 自动设置租户ID`,
          );
        } catch (error) {
          this.logger.error(
            `自动设置租户ID失败: ${error.message}`,
            error.stack,
          );
          throw error;
        }
      } else {
        // 验证租户ID
        try {
          if (Array.isArray(request.body)) {
            await this.tenantIsolation.validateDataArrayTenant(
              user.id,
              request.body,
              tenantField,
            );
          } else {
            await this.tenantIsolation.validateDataTenant(
              user.id,
              request.body,
              tenantField,
            );
          }
          this.logger.debug(
            `已验证用户 ${user.id} 的租户访问权限`,
          );
        } catch (error) {
          this.logger.error(
            `租户验证失败: ${error.message}`,
            error.stack,
          );
          throw error;
        }
      }
    }

    // 处理查询参数（GET）
    if (request.query && request.query[tenantField]) {
      const canAccess = await this.tenantIsolation.checkCrossTenantAccess(
        user.id,
        request.query[tenantField],
      );

      if (!canAccess) {
        this.logger.warn(
          `用户 ${user.id} 尝试通过查询参数跨租户访问: ${request.query[tenantField]}`,
        );
        throw new ForbiddenException('不允许跨租户访问');
      }
    }

    // 处理路径参数（GET/DELETE）
    if (request.params && request.params[tenantField]) {
      const canAccess = await this.tenantIsolation.checkCrossTenantAccess(
        user.id,
        request.params[tenantField],
      );

      if (!canAccess) {
        this.logger.warn(
          `用户 ${user.id} 尝试通过路径参数跨租户访问: ${request.params[tenantField]}`,
        );
        throw new ForbiddenException('不允许跨租户访问');
      }
    }

    // 验证响应数据（确保返回的数据属于正确的租户）
    return next.handle().pipe(
      tap(async (data) => {
        if (!data) {
          return;
        }

        try {
          // 验证单个对象
          if (typeof data === 'object' && !Array.isArray(data) && data[tenantField]) {
            await this.tenantIsolation.validateDataTenant(
              user.id,
              data,
              tenantField,
            );
          }

          // 验证数组
          if (Array.isArray(data)) {
            await this.tenantIsolation.validateDataArrayTenant(
              user.id,
              data,
              tenantField,
            );
          }

          // 验证分页数据
          if (this.isPaginatedData(data)) {
            const items = data.data || data.items || data.list;
            if (items && Array.isArray(items)) {
              await this.tenantIsolation.validateDataArrayTenant(
                user.id,
                items,
                tenantField,
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `响应数据租户验证失败: ${error.message}`,
            error.stack,
          );
          // 响应验证失败时记录警告但不阻止响应
          // 这是为了防止数据泄露
          this.logger.warn(
            `检测到潜在的跨租户数据泄露，已记录但未阻止响应`,
          );
        }
      }),
    );
  }

  /**
   * 判断是否为分页数据
   */
  private isPaginatedData(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      (data.data || data.items || data.list) &&
      (data.total !== undefined || data.page !== undefined || data.pageSize !== undefined)
    );
  }
}
