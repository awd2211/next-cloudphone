/**
 * 权限控制 Hook
 *
 * 提供便捷的权限检查功能
 *
 * @example
 * ```tsx
 * const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();
 *
 * if (hasPermission('device:create')) {
 *   // 显示创建设备按钮
 * }
 * ```
 */

import React, { useMemo, useState, useEffect } from 'react';

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
  description?: string;
}

export interface DataScope {
  id: string;
  resourceType: string;
  scopeType: 'all' | 'tenant' | 'department' | 'department_only' | 'self' | 'custom';
  description?: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  dataScopes: DataScope[];
}

/**
 * 权限检查 Hook
 */
export function usePermission() {
  // 从 localStorage 获取用户信息
  const [user, setUser] = useState<any>(() => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  });

  // 监听 localStorage 变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        setUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const userRoles = user?.roles as Role[] | undefined;

  /**
   * 获取用户所有权限名称列表
   */
  const permissionNames = useMemo(() => {
    if (!userRoles || userRoles.length === 0) {
      return new Set<string>();
    }

    const names = new Set<string>();
    userRoles.forEach(role => {
      role.permissions?.forEach(permission => {
        names.add(permission.name);
      });
    });

    return names;
  }, [userRoles]);

  /**
   * 检查是否有指定权限
   * @param permission 权限名称，如 'device:create' 或 'device.create'
   */
  const hasPermission = (permission: string): boolean => {
    if (!permission) return false;

    // 超级管理员拥有所有权限
    if (userRoles?.some(role => role.name === 'super_admin')) {
      return true;
    }

    // 支持两种格式: 'device:create' 和 'device.create'
    const normalizedPermission = permission.replace('.', ':');
    const alternativePermission = permission.replace(':', '.');

    return permissionNames.has(normalizedPermission) ||
           permissionNames.has(alternativePermission);
  };

  /**
   * 检查是否有任意一个权限
   * @param permissions 权限名称数组
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!permissions || permissions.length === 0) return false;
    return permissions.some(permission => hasPermission(permission));
  };

  /**
   * 检查是否拥有所有权限
   * @param permissions 权限名称数组
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!permissions || permissions.length === 0) return false;
    return permissions.every(permission => hasPermission(permission));
  };

  /**
   * 检查是否有指定资源的任意操作权限
   * @param resource 资源名称，如 'device', 'user'
   */
  const hasResourcePermission = (resource: string): boolean => {
    if (!resource) return false;

    // 超级管理员拥有所有权限
    if (userRoles?.some(role => role.name === 'super_admin')) {
      return true;
    }

    // 检查是否有该资源的任意权限
    return userRoles?.some(role =>
      role.permissions?.some(permission =>
        permission.resource === resource
      )
    ) ?? false;
  };

  /**
   * 获取指定资源的数据范围
   * @param resource 资源名称
   */
  const getDataScope = (resource: string): DataScope | undefined => {
    if (!resource || !userRoles) return undefined;

    // 超级管理员默认 'all' 范围
    if (userRoles.some(role => role.name === 'super_admin')) {
      return {
        id: 'super_admin_scope',
        resourceType: resource,
        scopeType: 'all',
        description: '超级管理员可访问所有数据'
      };
    }

    // 查找第一个匹配的数据范围（通常每个角色每种资源只有一个范围）
    for (const role of userRoles) {
      const scope = role.dataScopes?.find(
        ds => ds.resourceType === resource
      );
      if (scope) return scope;
    }

    return undefined;
  };

  /**
   * 检查是否是指定角色
   * @param roleName 角色名称
   */
  const hasRole = (roleName: string): boolean => {
    return userRoles?.some(role => role.name === roleName) ?? false;
  };

  /**
   * 检查是否有任意一个角色
   * @param roleNames 角色名称数组
   */
  const hasAnyRole = (roleNames: string[]): boolean => {
    return roleNames.some(roleName => hasRole(roleName));
  };

  /**
   * 获取用户的所有角色名称
   */
  const getRoleNames = (): string[] => {
    return userRoles?.map(role => role.name) ?? [];
  };

  /**
   * 检查是否是超级管理员
   */
  const isSuperAdmin = useMemo(() => {
    return hasRole('super_admin');
  }, [userRoles]);

  /**
   * 检查是否是管理员（super_admin, admin, tenant_admin）
   */
  const isAdmin = useMemo(() => {
    return hasAnyRole(['super_admin', 'admin', 'tenant_admin']);
  }, [userRoles]);

  return {
    // 权限检查
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasResourcePermission,

    // 数据范围
    getDataScope,

    // 角色检查
    hasRole,
    hasAnyRole,
    getRoleNames,
    isSuperAdmin,
    isAdmin,

    // 原始数据
    permissions: permissionNames,
    roles: userRoles,
  };
}

/**
 * 权限检查装饰器 - 用于组件级权限控制
 *
 * @example
 * ```tsx
 * export default withPermission(['device:create', 'device:update'])(DeviceForm);
 * ```
 */
export function withPermission(requiredPermissions: string[], requireAll = false) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function PermissionWrapper(props: P) {
      const { hasAnyPermission, hasAllPermissions } = usePermission();

      const hasAccess = requireAll
        ? hasAllPermissions(requiredPermissions)
        : hasAnyPermission(requiredPermissions);

      if (!hasAccess) {
        return null; // 或者返回一个无权限提示组件
      }

      return <Component {...props} />;
    };
  };
}

/**
 * 角色检查装饰器 - 用于组件级角色控制
 *
 * @example
 * ```tsx
 * export default withRole(['admin', 'super_admin'])(AdminPanel);
 * ```
 */
export function withRole(requiredRoles: string[]) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function RoleWrapper(props: P) {
      const { hasAnyRole } = usePermission();

      if (!hasAnyRole(requiredRoles)) {
        return null;
      }

      return <Component {...props} />;
    };
  };
}
/**
 * 权限守卫组件 - 用于包裹需要权限控制的内容
 *
 * @example
 * ```tsx
 * <PermissionGuard permission="device:create">
 *   <CreateDeviceButton />
 * </PermissionGuard>
 * ```
 */
interface PermissionGuardProps {
  /** 需要的权限，如 'device:create' */
  permission: string;
  /** 子元素 */
  children: React.ReactNode;
  /** 无权限时显示的内容，默认不显示任何内容 */
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = React.memo(
  ({ permission, children, fallback = null }) => {
    const { hasPermission } = usePermission();

    if (!hasPermission(permission)) {
      return <>{fallback}</>;
    }

    return <>{children}</>;
  }
);

PermissionGuard.displayName = 'PermissionGuard';

/**
 * 权限守卫 Hook - 返回权限检查结果
 *
 * @example
 * ```tsx
 * const { hasAccess, isLoading } = usePermissionGuard('device:create');
 * ```
 */
export function usePermissionGuard(permission: string) {
  const { hasPermission } = usePermission();

  return {
    hasAccess: hasPermission(permission),
    isLoading: false, // localStorage 是同步读取的，无需 loading 状态
  };
}

/**
 * 清理权限缓存
 *
 * 注意：由于现在使用 localStorage 和 React state，
 * 此函数主要用于向后兼容。实际的清理在登出时通过
 * localStorage.removeItem('user') 完成。
 */
export const clearPermissionCache = () => {
  // 清理 localStorage 中的用户信息
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user');
  }
};
