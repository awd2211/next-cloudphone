/**
 * 验证工具统一导出
 * 提供客户端表单验证功能
 */

// API Key 验证
export {
  validateScope,
  isDateInFuture,
  validateCreateApiKeyDto,
  getScopeSuggestions,
} from './apiKey';

// Role 验证
export {
  validateRoleName,
  getRoleNameError,
  validateCreateRoleData,
  validatePermissionIds,
  getRoleNameSuggestions,
} from './role';
