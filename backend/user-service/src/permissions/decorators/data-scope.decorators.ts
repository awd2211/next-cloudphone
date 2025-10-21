import { SetMetadata } from '@nestjs/common';
import {
  DATA_SCOPE_RESOURCE_KEY,
  SKIP_DATA_SCOPE_KEY,
} from '../interceptors/data-scope.interceptor';
import {
  FIELD_FILTER_RESOURCE_KEY,
  FIELD_FILTER_OPERATION_KEY,
  SKIP_FIELD_FILTER_KEY,
} from '../interceptors/field-filter.interceptor';
import { OperationType } from '../../entities/field-permission.entity';

/**
 * 应用数据范围过滤
 * @param resourceType 资源类型（如 'user', 'device', 'order'）
 *
 * @example
 * @DataScopeResource('device')
 * async getDevices() { ... }
 */
export const DataScopeResource = (resourceType: string) =>
  SetMetadata(DATA_SCOPE_RESOURCE_KEY, resourceType);

/**
 * 跳过数据范围过滤
 *
 * @example
 * @SkipDataScope()
 * async getAllDevicesWithoutFilter() { ... }
 */
export const SkipDataScope = () => SetMetadata(SKIP_DATA_SCOPE_KEY, true);

/**
 * 应用字段过滤
 * @param resourceType 资源类型
 * @param operation 操作类型（默认为 VIEW）
 *
 * @example
 * @FieldFilterResource('user', OperationType.VIEW)
 * async getUser() { ... }
 */
export const FieldFilterResource = (
  resourceType: string,
  operation: OperationType = OperationType.VIEW,
) => {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    SetMetadata(FIELD_FILTER_RESOURCE_KEY, resourceType)(
      target,
      propertyKey,
      descriptor,
    );
    SetMetadata(FIELD_FILTER_OPERATION_KEY, operation)(
      target,
      propertyKey,
      descriptor,
    );
    return descriptor;
  };
};

/**
 * 跳过字段过滤
 *
 * @example
 * @SkipFieldFilter()
 * async getUserWithAllFields() { ... }
 */
export const SkipFieldFilter = () => SetMetadata(SKIP_FIELD_FILTER_KEY, true);

/**
 * 组合装饰器：完整数据权限控制（数据范围 + 字段过滤）
 * @param resourceType 资源类型
 * @param operation 操作类型
 *
 * @example
 * @FullDataControl('user', OperationType.VIEW)
 * async getUsers() { ... }
 */
export const FullDataControl = (
  resourceType: string,
  operation: OperationType = OperationType.VIEW,
) => {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // 应用数据范围过滤
    SetMetadata(DATA_SCOPE_RESOURCE_KEY, resourceType)(
      target,
      propertyKey,
      descriptor,
    );
    // 应用字段过滤
    SetMetadata(FIELD_FILTER_RESOURCE_KEY, resourceType)(
      target,
      propertyKey,
      descriptor,
    );
    SetMetadata(FIELD_FILTER_OPERATION_KEY, operation)(
      target,
      propertyKey,
      descriptor,
    );
    return descriptor;
  };
};

/**
 * 组合装饰器：查看操作的数据控制
 * @param resourceType 资源类型
 *
 * @example
 * @ViewDataControl('user')
 * async getUser(@Param('id') id: string) { ... }
 */
export const ViewDataControl = (resourceType: string) =>
  FullDataControl(resourceType, OperationType.VIEW);

/**
 * 组合装饰器：创建操作的数据控制
 * @param resourceType 资源类型
 *
 * @example
 * @CreateDataControl('user')
 * async createUser(@Body() dto: CreateUserDto) { ... }
 */
export const CreateDataControl = (resourceType: string) =>
  FullDataControl(resourceType, OperationType.CREATE);

/**
 * 组合装饰器：更新操作的数据控制
 * @param resourceType 资源类型
 *
 * @example
 * @UpdateDataControl('user')
 * async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) { ... }
 */
export const UpdateDataControl = (resourceType: string) =>
  FullDataControl(resourceType, OperationType.UPDATE);

/**
 * 组合装饰器：导出操作的数据控制
 * @param resourceType 资源类型
 *
 * @example
 * @ExportDataControl('user')
 * async exportUsers() { ... }
 */
export const ExportDataControl = (resourceType: string) =>
  FullDataControl(resourceType, OperationType.EXPORT);
