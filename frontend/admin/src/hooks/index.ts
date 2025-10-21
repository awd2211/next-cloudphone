/**
 * Hooks 统一导出
 */

// 权限相关 Hooks
export { usePermission, PermissionGuard, usePermissionGuard } from './usePermission';
export { useDataScope } from './useDataScope';
export { useMenu, MenuGuard } from './useMenu';
export { useFieldPermission } from './useFieldPermission';

// 导出类型
export type { MenuItem, BreadcrumbItem } from './useMenu';
export type {
  DataScope,
  ScopeTypeMetadata,
  CreateDataScopeDto,
  UpdateDataScopeDto,
  DataScopeQueryParams,
  DataScopeSelectorProps,
} from './useDataScope';
export type {
  FieldPermission,
  CreateFieldPermissionDto,
  UpdateFieldPermissionDto,
  FieldPermissionQueryParams,
} from './useFieldPermission';

// 导出枚举
export { ScopeType } from './useDataScope';
export { FieldAccessLevel, OperationType } from './useFieldPermission';
