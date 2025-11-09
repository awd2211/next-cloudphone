/**
 * 验证角色名格式
 * 规则: 必须以字母开头，只能包含字母、数字、下划线和连字符
 * 最大长度: 50个字符
 *
 * @example
 * validateRoleName('admin_role')      // true
 * validateRoleName('Admin-Role-123')  // true
 * validateRoleName('123_admin')       // false (数字开头)
 * validateRoleName('admin role')      // false (包含空格)
 * validateRoleName('admin@role')      // false (特殊字符)
 */
export const validateRoleName = (name: string): boolean => {
  if (!name || name.length === 0 || name.length > 50) {
    return false;
  }
  return /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name);
};

/**
 * 获取角色名验证错误信息
 *
 * @example
 * getRoleNameError('123_admin')
 * // '角色名必须以字母开头，只能包含字母、数字、下划线和连字符'
 *
 * getRoleNameError('a'.repeat(51))
 * // '角色名不能超过50个字符'
 */
export const getRoleNameError = (name: string): string | null => {
  if (!name || name.length === 0) {
    return '角色名不能为空';
  }

  if (name.length > 50) {
    return '角色名不能超过50个字符';
  }

  if (!/^[a-zA-Z]/.test(name)) {
    return '角色名必须以字母开头';
  }

  if (!/^[a-zA-Z0-9_-]*$/.test(name)) {
    return '角色名只能包含字母、数字、下划线和连字符';
  }

  return null;
};

/**
 * 验证创建角色的数据
 *
 * @example
 * validateCreateRoleData({
 *   name: '123_admin',
 *   description: 'Test role',
 *   permissionIds: []
 * })
 * // ['name: 角色名必须以字母开头', 'permissionIds: 至少需要选择一个权限']
 */
export const validateCreateRoleData = (data: {
  name: string;
  description?: string;
  permissionIds: string[];
}): string[] => {
  const errors: string[] = [];

  // 验证角色名
  const nameError = getRoleNameError(data.name);
  if (nameError) {
    errors.push(`name: ${nameError}`);
  }

  // 验证权限ID
  if (!data.permissionIds || data.permissionIds.length === 0) {
    errors.push('permissionIds: 至少需要选择一个权限');
  }

  // 验证描述长度
  if (data.description && data.description.length > 200) {
    errors.push('description: 描述不能超过200个字符');
  }

  return errors;
};

/**
 * 验证权限ID数组
 *
 * @example
 * validatePermissionIds([])  // false
 * validatePermissionIds(['perm-1', 'perm-2'])  // true
 */
export const validatePermissionIds = (permissionIds: string[]): boolean => {
  return Array.isArray(permissionIds) && permissionIds.length > 0;
};

/**
 * 生成角色名建议
 */
export const getRoleNameSuggestions = (): string[] => {
  return [
    'admin',
    'user',
    'manager',
    'operator',
    'developer',
    'viewer',
    'editor',
    'custom_role',
  ];
};
