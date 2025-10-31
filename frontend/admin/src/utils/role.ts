/**
 * 用户角色枚举
 */
export enum UserRole {
  /**
   * 超级管理员 - 拥有所有权限
   */
  SUPER_ADMIN = 'super_admin',

  /**
   * 管理员 - 拥有租户内所有权限
   */
  ADMIN = 'admin',

  /**
   * 普通用户 - 只能访问自己的资源
   */
  USER = 'user',

  /**
   * 访客 - 只读权限
   */
  GUEST = 'guest',
}

/**
 * 角色类型（从 API 返回的角色对象）
 */
export interface Role {
  id: string;
  name: string;
  description?: string;
  level?: number;
}

/**
 * 检查是否为管理员角色
 */
export function isAdminRole(role: string): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
}

/**
 * 检查用户是否拥有管理员角色
 */
export function hasAdminRole(roles: string[] | Role[]): boolean {
  if (!roles || roles.length === 0) {
    return false;
  }

  const roleNames = roles.map((r) => (typeof r === 'string' ? r : r.name));
  return roleNames.some((name) => isAdminRole(name));
}

/**
 * 检查是否为超级管理员
 */
export function isSuperAdmin(roles: string[] | Role[]): boolean {
  if (!roles || roles.length === 0) {
    return false;
  }

  const roleNames = roles.map((r) => (typeof r === 'string' ? r : r.name));
  return roleNames.includes(UserRole.SUPER_ADMIN);
}

/**
 * 获取用户的最高角色
 */
export function getHighestRole(roles: string[] | Role[]): UserRole | null {
  if (!roles || roles.length === 0) {
    return null;
  }

  const roleNames = roles.map((r) => (typeof r === 'string' ? r : r.name));

  if (roleNames.includes(UserRole.SUPER_ADMIN)) {
    return UserRole.SUPER_ADMIN;
  }
  if (roleNames.includes(UserRole.ADMIN)) {
    return UserRole.ADMIN;
  }
  if (roleNames.includes(UserRole.USER)) {
    return UserRole.USER;
  }
  if (roleNames.includes(UserRole.GUEST)) {
    return UserRole.GUEST;
  }

  return null;
}

/**
 * 获取角色的显示名称
 */
export function getRoleDisplayName(role: string): string {
  const roleMap: Record<string, string> = {
    [UserRole.SUPER_ADMIN]: '超级管理员',
    [UserRole.ADMIN]: '管理员',
    [UserRole.USER]: '普通用户',
    [UserRole.GUEST]: '访客',
  };

  return roleMap[role] || role;
}

/**
 * 获取角色的颜色（用于标签显示）
 */
export function getRoleColor(role: string): string {
  const colorMap: Record<string, string> = {
    [UserRole.SUPER_ADMIN]: 'red',
    [UserRole.ADMIN]: 'orange',
    [UserRole.USER]: 'blue',
    [UserRole.GUEST]: 'default',
  };

  return colorMap[role] || 'default';
}

/**
 * 检查用户是否有特定权限
 * @param userPermissions 用户拥有的权限列表
 * @param requiredPermission 需要的权限（格式：resource.action）
 */
export function hasPermission(userPermissions: string[], requiredPermission: string): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  return userPermissions.includes(requiredPermission);
}

/**
 * 检查用户是否拥有任一权限
 * @param userPermissions 用户拥有的权限列表
 * @param requiredPermissions 需要的权限列表
 */
export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  return requiredPermissions.some((permission) => userPermissions.includes(permission));
}

/**
 * 检查用户是否拥有所有权限
 * @param userPermissions 用户拥有的权限列表
 * @param requiredPermissions 需要的权限列表
 */
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }

  return requiredPermissions.every((permission) => userPermissions.includes(permission));
}
