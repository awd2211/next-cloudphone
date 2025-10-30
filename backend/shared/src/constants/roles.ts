/**
 * 系统角色枚举
 */
export enum UserRole {
  /**
   * 超级管理员 - 拥有所有权限，可跨租户操作
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
 * 检查是否为管理员角色
 */
export function isAdminRole(role: string): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
}

/**
 * 检查用户是否拥有管理员角色
 */
export function hasAdminRole(roles: string[] | any[]): boolean {
  if (!roles || roles.length === 0) {
    return false;
  }

  const roleNames = roles.map((r) => (typeof r === 'string' ? r : r.name));
  return roleNames.some((name) => isAdminRole(name));
}

/**
 * 检查是否为超级管理员
 */
export function isSuperAdmin(roles: string[] | any[]): boolean {
  if (!roles || roles.length === 0) {
    return false;
  }

  const roleNames = roles.map((r) => (typeof r === 'string' ? r : r.name));
  return roleNames.includes(UserRole.SUPER_ADMIN);
}
