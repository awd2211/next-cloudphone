import { useMemo } from 'react';
import {
  hasAdminRole,
  isSuperAdmin,
  getHighestRole,
  getRoleColor,
  getRoleDisplayName,
  UserRole,
} from '@/utils/role';

/**
 * 用户角色 Hook
 * 用于检查用户角色和显示角色相关信息
 *
 * @example
 * const { isAdmin, isSuperAdmin, roles, highestRole } = useRole();
 *
 * if (isAdmin) {
 *   return <AdminDashboard />;
 * }
 */
export const useRole = () => {
  // 从localStorage获取用户信息
  // TODO: 替换为实际的状态管理方案 (Redux, Zustand, Context等)
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user = userStr ? JSON.parse(userStr) : null;

  const roles = useMemo(() => {
    return user?.roles || [];
  }, [user]);

  const isAdmin = useMemo(() => {
    return hasAdminRole(roles);
  }, [roles]);

  const isSuperAdminRole = useMemo(() => {
    return isSuperAdmin(roles);
  }, [roles]);

  const highestRole = useMemo(() => {
    return getHighestRole(roles);
  }, [roles]);

  const roleColor = useMemo(() => {
    return highestRole ? getRoleColor(highestRole) : 'default';
  }, [highestRole]);

  const roleDisplayName = useMemo(() => {
    return highestRole ? getRoleDisplayName(highestRole) : '未知';
  }, [highestRole]);

  /**
   * 检查是否拥有特定角色
   */
  const hasRole = (roleName: string): boolean => {
    const roleNames = roles.map((r: any) => (typeof r === 'string' ? r : r.name));
    return roleNames.includes(roleName);
  };

  /**
   * 检查是否拥有任一角色
   */
  const hasAnyRole = (roleNames: string[]): boolean => {
    const userRoleNames = roles.map((r: any) => (typeof r === 'string' ? r : r.name));
    return roleNames.some((name) => userRoleNames.includes(name));
  };

  return {
    // 当前用户
    user,

    // 角色列表
    roles,

    // 角色判断
    isAdmin,
    isSuperAdmin: isSuperAdminRole,

    // 最高角色
    highestRole,
    roleColor,
    roleDisplayName,

    // 角色检查方法
    hasRole,
    hasAnyRole,
  };
};

/**
 * 管理员角色 Hook
 * 简化的管理员检查
 *
 * @returns boolean 是否为管理员
 */
export const useIsAdmin = (): boolean => {
  const { isAdmin } = useRole();
  return isAdmin;
};

/**
 * 超级管理员角色 Hook
 *
 * @returns boolean 是否为超级管理员
 */
export const useIsSuperAdmin = (): boolean => {
  const { isSuperAdmin } = useRole();
  return isSuperAdmin;
};

/**
 * RoleGuard 组件
 * 根据角色控制子组件的显示
 *
 * @example
 * <RoleGuard role="admin">
 *   <AdminPanel />
 * </RoleGuard>
 *
 * <RoleGuard anyOf={['admin', 'super_admin']}>
 *   <ManagementPanel />
 * </RoleGuard>
 *
 * <RoleGuard adminOnly>
 *   <SystemSettings />
 * </RoleGuard>
 */
interface RoleGuardProps {
  children: React.ReactNode;
  role?: string;
  anyOf?: string[];
  allOf?: string[];
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  fallback?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  role,
  anyOf,
  allOf,
  adminOnly = false,
  superAdminOnly = false,
  fallback = null,
}) => {
  const { hasRole, hasAnyRole, isAdmin, isSuperAdmin } = useRole();

  let hasAccess = true;

  // 超级管理员专属
  if (superAdminOnly) {
    hasAccess = isSuperAdmin;
  }
  // 管理员专属
  else if (adminOnly) {
    hasAccess = isAdmin;
  }
  // 检查特定角色
  else if (role) {
    hasAccess = hasRole(role);
  }
  // 检查任一角色
  else if (anyOf && anyOf.length > 0) {
    hasAccess = hasAnyRole(anyOf);
  }
  // 检查所有角色
  else if (allOf && allOf.length > 0) {
    const roles = allOf.map((r) => hasRole(r));
    hasAccess = roles.every((r) => r);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

export default useRole;
