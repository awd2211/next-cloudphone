import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { FieldFilterService } from '../field-filter.service';
import { OperationType } from '../../entities/field-permission.entity';

/**
 * 字段过滤元数据键
 */
export const FIELD_FILTER_RESOURCE_KEY = 'fieldFilterResource';
export const FIELD_FILTER_OPERATION_KEY = 'fieldFilterOperation';
export const SKIP_FIELD_FILTER_KEY = 'skipFieldFilter';

/**
 * 字段过滤拦截器
 * 自动过滤响应数据中的字段并应用数据脱敏
 *
 * 使用方式：
 * @UseInterceptors(FieldFilterInterceptor)
 * @FieldFilterResource('user', OperationType.VIEW)
 * async getUser(@Param('id') id: string) {
 *   return this.userService.findOne(id);
 * }
 */
@Injectable()
export class FieldFilterInterceptor implements NestInterceptor {
  private readonly logger = new Logger(FieldFilterInterceptor.name);

  constructor(
    private reflector: Reflector,
    private fieldFilterService: FieldFilterService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // 检查是否跳过字段过滤
    const skipFieldFilter = this.reflector.getAllAndOverride<boolean>(SKIP_FIELD_FILTER_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipFieldFilter) {
      return next.handle();
    }

    // 获取资源类型
    const resourceType = this.reflector.getAllAndOverride<string>(FIELD_FILTER_RESOURCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 获取操作类型
    const operation =
      this.reflector.getAllAndOverride<OperationType>(FIELD_FILTER_OPERATION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || OperationType.VIEW;

    // 如果没有配置资源类型，跳过字段过滤
    if (!resourceType) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 如果没有用户信息，跳过
    if (!user || !user.id) {
      return next.handle();
    }

    // 处理响应数据
    return next.handle().pipe(
      map(async (data) => {
        try {
          return await this.filterResponseData(user.id, resourceType, operation, data);
        } catch (error) {
          this.logger.error(`过滤响应字段失败: ${error.message}`, error.stack);
          // 失败时返回原始数据
          return data;
        }
      })
    );
  }

  /**
   * 过滤响应数据
   */
  private async filterResponseData(
    userId: string,
    resourceType: string,
    operation: OperationType,
    data: any
  ): Promise<any> {
    if (!data) {
      return data;
    }

    // 处理分页数据
    if (this.isPaginatedData(data)) {
      const filtered = await this.fieldFilterService.filterFieldsArray(
        userId,
        resourceType,
        data.data || data.items || data.list,
        operation
      );
      return {
        ...data,
        data: filtered,
        items: filtered,
        list: filtered,
      };
    }

    // 处理数组数据
    if (Array.isArray(data)) {
      return this.fieldFilterService.filterFieldsArray(userId, resourceType, data, operation);
    }

    // 处理单个对象
    if (typeof data === 'object') {
      return this.fieldFilterService.filterFields(userId, resourceType, data, operation);
    }

    // 其他类型直接返回
    return data;
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
