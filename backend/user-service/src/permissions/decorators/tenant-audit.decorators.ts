import { SetMetadata } from '@nestjs/common';
import {
  SKIP_TENANT_ISOLATION_KEY,
  TENANT_FIELD_KEY,
  AUTO_SET_TENANT_KEY,
} from '../interceptors/tenant.interceptor';
import {
  AUDIT_PERMISSION_KEY,
  SKIP_AUDIT_KEY,
  AUDIT_RESOURCE_KEY,
  AUDIT_ACTION_KEY,
} from '../interceptors/audit-permission.interceptor';

// ==================== 租户隔离装饰器 ====================

/**
 * 跳过租户隔离检查
 *
 * @example
 * @SkipTenantIsolation()
 * async crossTenantOperation() { ... }
 */
export const SkipTenantIsolation = () =>
  SetMetadata(SKIP_TENANT_ISOLATION_KEY, true);

/**
 * 自定义租户字段名
 * @param fieldName 租户字段名（默认为 'tenantId'）
 *
 * @example
 * @TenantField('organizationId')
 * async getOrganizationData() { ... }
 */
export const TenantField = (fieldName: string) =>
  SetMetadata(TENANT_FIELD_KEY, fieldName);

/**
 * 自动设置租户ID
 * 在创建资源时自动将当前用户的租户ID设置到数据中
 *
 * @example
 * @AutoSetTenant()
 * async createDevice(@Body() dto: CreateDeviceDto) {
 *   // dto.tenantId 会被自动设置
 * }
 */
export const AutoSetTenant = () => SetMetadata(AUTO_SET_TENANT_KEY, true);

// ==================== 审计装饰器 ====================

/**
 * 启用审计记录
 * @param resource 资源类型
 * @param action 操作类型
 *
 * @example
 * @AuditPermission({ resource: 'user', action: 'delete' })
 * async deleteUser(@Param('id') id: string) { ... }
 */
export const AuditPermission = (config?: {
  resource?: string;
  action?: string;
}) => {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // 启用审计
    SetMetadata(AUDIT_PERMISSION_KEY, true)(target, propertyKey, descriptor);

    // 设置资源类型
    if (config?.resource) {
      SetMetadata(AUDIT_RESOURCE_KEY, config.resource)(
        target,
        propertyKey,
        descriptor,
      );
    }

    // 设置操作类型
    if (config?.action) {
      SetMetadata(AUDIT_ACTION_KEY, config.action)(
        target,
        propertyKey,
        descriptor,
      );
    }

    return descriptor;
  };
};

/**
 * 跳过审计记录
 *
 * @example
 * @SkipAudit()
 * async internalOperation() { ... }
 */
export const SkipAudit = () => SetMetadata(SKIP_AUDIT_KEY, true);

// ==================== 组合装饰器 ====================

/**
 * 组合装饰器：审计创建操作
 * @param resource 资源类型
 *
 * @example
 * @AuditCreate('user')
 * async createUser(@Body() dto: CreateUserDto) { ... }
 */
export const AuditCreate = (resource: string) =>
  AuditPermission({ resource, action: 'create' });

/**
 * 组合装饰器：审计更新操作
 * @param resource 资源类型
 *
 * @example
 * @AuditUpdate('user')
 * async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) { ... }
 */
export const AuditUpdate = (resource: string) =>
  AuditPermission({ resource, action: 'update' });

/**
 * 组合装饰器：审计删除操作
 * @param resource 资源类型
 *
 * @example
 * @AuditDelete('user')
 * async deleteUser(@Param('id') id: string) { ... }
 */
export const AuditDelete = (resource: string) =>
  AuditPermission({ resource, action: 'delete' });

/**
 * 组合装饰器：审计导出操作
 * @param resource 资源类型
 *
 * @example
 * @AuditExport('user')
 * async exportUsers() { ... }
 */
export const AuditExport = (resource: string) =>
  AuditPermission({ resource, action: 'export' });

/**
 * 组合装饰器：审计授权操作
 * @param resource 资源类型
 *
 * @example
 * @AuditGrant('permission')
 * async grantPermission(@Body() dto: GrantPermissionDto) { ... }
 */
export const AuditGrant = (resource: string) =>
  AuditPermission({ resource, action: 'grant' });

/**
 * 组合装饰器：审计撤销操作
 * @param resource 资源类型
 *
 * @example
 * @AuditRevoke('permission')
 * async revokePermission(@Body() dto: RevokePermissionDto) { ... }
 */
export const AuditRevoke = (resource: string) =>
  AuditPermission({ resource, action: 'revoke' });
