import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { DataScopeService } from '../data-scope.service';

/**
 * 数据范围元数据键
 */
export const DATA_SCOPE_RESOURCE_KEY = 'dataScopeResource';
export const SKIP_DATA_SCOPE_KEY = 'skipDataScope';

/**
 * 数据范围拦截器
 * 自动在请求上下文中注入数据范围过滤器
 *
 * 使用方式：
 * @UseInterceptors(DataScopeInterceptor)
 * @DataScopeResource('device')
 * async getDevices() {
 *   // 在 service 中可以从 request.dataScopeFilter 获取过滤条件
 * }
 */
@Injectable()
export class DataScopeInterceptor implements NestInterceptor {
  private readonly logger = new Logger(DataScopeInterceptor.name);

  constructor(
    private reflector: Reflector,
    private dataScopeService: DataScopeService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    // 检查是否跳过数据范围过滤
    const skipDataScope = this.reflector.getAllAndOverride<boolean>(
      SKIP_DATA_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipDataScope) {
      return next.handle();
    }

    // 获取资源类型
    const resourceType = this.reflector.getAllAndOverride<string>(
      DATA_SCOPE_RESOURCE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有配置资源类型，跳过数据范围过滤
    if (!resourceType) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 如果没有用户信息，跳过
    if (!user || !user.id) {
      return next.handle();
    }

    try {
      // 获取数据范围过滤器
      const filter = await this.dataScopeService.getDataScopeFilter(
        user.id,
        resourceType,
      );

      // 将过滤器附加到请求对象
      request.dataScopeFilter = filter;
      request.dataScopeResource = resourceType;

      this.logger.debug(
        `已为用户 ${user.id} 应用 ${resourceType} 的数据范围过滤`,
      );
    } catch (error) {
      this.logger.error(
        `应用数据范围过滤失败: ${error.message}`,
        error.stack,
      );
      // 失败时不影响请求继续执行
    }

    return next.handle();
  }
}
