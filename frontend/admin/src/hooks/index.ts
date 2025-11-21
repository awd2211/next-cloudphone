/**
 * Hooks 统一导出
 */

// 权限相关 Hooks
export { usePermission, PermissionGuard, usePermissionGuard } from './usePermission';
export { useDataScope } from './useDataScope';
export { useMenu, MenuGuard } from './useMenu';
export { useFieldPermission } from './useFieldPermission';

// 主题相关 Hooks
export { useTheme } from './useTheme';
export { useThemeColors } from './useThemeColors';
export type { ThemeColors } from './useThemeColors';

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
// FieldPermission 相关类型已在 @/types 中定义，不需要从 hook 重新导出

// 导出枚举
export { ScopeType } from './useDataScope';
// Note: FieldAccessLevel 和 OperationType 是类型定义，应从 @/types 导入
// 它们在 types/index.ts 中已经导出
