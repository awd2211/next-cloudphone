/**
 * 权限装饰器统一导出
 *
 * 使用示例：
 * import {
 *   RequirePermissions,
 *   ViewDataControl,
 *   AutoSetTenant,
 *   AuditDelete
 * } from './permissions/decorators';
 */

// 功能权限装饰器
export * from './function-permission.decorators';

// 数据范围装饰器
export * from './data-scope.decorators';

// 租户和审计装饰器
export * from './tenant-audit.decorators';
