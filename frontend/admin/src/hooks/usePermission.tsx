import { useState, useEffect, useCallback, memo } from 'react';
import { api } from '../utils/api';

/**
 * 权限上下文
 */
interface PermissionContext {
  permissions: string[];
  isSuperAdmin: boolean;
  loading: boolean;
  error: Error | null;
}

/**
 * 全局权限缓存
 */
let globalPermissions: string[] | null = null;
let globalIsSuperAdmin = false;
let permissionPromise: Promise<any> | null = null;

/**
 * 清除权限缓存（独立函数，供登出时调用）
 *
 * @example
 * import { clearPermissionCache } from '@/hooks/usePermission';
 *
 * // 登出时清理缓存
 * const handleLogout = () => {
 *   clearPermissionCache();
 *   clearMenuCache();
 *   localStorage.clear();
 *   navigate('/login');
 * };
 */
export const clearPermissionCache = () => {
  globalPermissions = null;
  globalIsSuperAdmin = false;
  permissionPromise = null;
};

/**
 * usePermission Hook
 * 用于检查用户权限
 *
 * @example
 * const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin } = usePermission();
 *
 * // 检查单个权限
 * if (hasPermission('user:create')) {
 *   return <CreateButton />;
 * }
 *
 * // 检查任意权限
 * if (hasAnyPermission(['user:create', 'user:update'])) {
 *   return <EditForm />;
 * }
 *
 * // 检查所有权限
 * if (hasAllPermissions(['user:delete', 'admin:access'])) {
 *   return <DeleteButton />;
 * }
 */
export const usePermission = () => {
  const [context, setContext] = useState<PermissionContext>({
    permissions: globalPermissions || [],
    isSuperAdmin: globalIsSuperAdmin,
    loading: globalPermissions === null,
    error: null,
  });

  /**
   * 加载用户权限
   */
  const loadPermissions = useCallback(async () => {
    // 如果已经在加载中，复用 Promise
    if (permissionPromise) {
      return permissionPromise;
    }

    // 如果已经有缓存，直接返回
    if (globalPermissions !== null) {
      return;
    }

    try {
      permissionPromise = api.get<string[] | { data: string[] }>('/menu-permissions/my-permissions');
      const result = await permissionPromise;

      // 健壮处理：支持直接数组或 { data: [...] } 格式
      if (Array.isArray(result)) {
        globalPermissions = result;
      } else if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
        globalPermissions = result.data;
      } else {
        globalPermissions = [];
      }

      globalIsSuperAdmin = globalPermissions?.includes('*') ?? false;

      setContext({
        permissions: globalPermissions || [],
        isSuperAdmin: globalIsSuperAdmin,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      setContext((prev) => ({
        ...prev,
        loading: false,
        error,
      }));
    } finally {
      permissionPromise = null;
    }
  }, []);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  /**
   * 检查是否拥有指定权限
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (context.isSuperAdmin) return true;
      if (!permission) return true;
      return context.permissions.includes(permission);
    },
    [context.permissions, context.isSuperAdmin]
  );

  /**
   * 检查是否拥有任意一个权限
   */
  const hasAnyPermission = useCallback(
    (permissions: string[]): boolean => {
      if (context.isSuperAdmin) return true;
      if (!permissions || permissions.length === 0) return true;
      return permissions.some((p) => context.permissions.includes(p));
    },
    [context.permissions, context.isSuperAdmin]
  );

  /**
   * 检查是否拥有所有权限
   */
  const hasAllPermissions = useCallback(
    (permissions: string[]): boolean => {
      if (context.isSuperAdmin) return true;
      if (!permissions || permissions.length === 0) return true;
      return permissions.every((p) => context.permissions.includes(p));
    },
    [context.permissions, context.isSuperAdmin]
  );

  /**
   * 刷新权限缓存
   */
  const refreshPermissions = useCallback(async () => {
    globalPermissions = null;
    permissionPromise = null;
    setContext((prev) => ({ ...prev, loading: true }));
    await loadPermissions();
  }, [loadPermissions]);

  /**
   * 清除权限缓存
   */
  const clearPermissions = useCallback(() => {
    globalPermissions = null;
    globalIsSuperAdmin = false;
    permissionPromise = null;
    setContext({
      permissions: [],
      isSuperAdmin: false,
      loading: false,
      error: null,
    });
  }, []);

  return {
    // 权限列表
    permissions: context.permissions,

    // 是否为超级管理员
    isSuperAdmin: context.isSuperAdmin,

    // 加载状态
    loading: context.loading,
    error: context.error,

    // 权限检查方法
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // 缓存管理
    refreshPermissions,
    clearPermissions,
  };
};

/**
 * PermissionGuard 组件
 * 用于根据权限控制子组件的显示
 *
 * @example
 * <PermissionGuard permission="user:create">
 *   <CreateButton />
 * </PermissionGuard>
 *
 * <PermissionGuard anyOf={['user:create', 'user:update']}>
 *   <EditForm />
 * </PermissionGuard>
 *
 * <PermissionGuard allOf={['user:delete', 'admin:access']}>
 *   <DeleteButton />
 * </PermissionGuard>
 */
interface PermissionGuardProps {
  children: React.ReactNode;
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
  fallback?: React.ReactNode;
}

// ✅ 使用 memo 包装组件，避免不必要的重渲染
export const PermissionGuard: React.FC<PermissionGuardProps> = memo(({
  children,
  permission,
  anyOf,
  allOf,
  fallback = null,
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermission();

  if (loading) {
    return <>{fallback}</>;
  }

  let hasAccess = true;

  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (anyOf && anyOf.length > 0) {
    hasAccess = hasAnyPermission(anyOf);
  } else if (allOf && allOf.length > 0) {
    hasAccess = hasAllPermissions(allOf);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
});

PermissionGuard.displayName = 'PermissionGuard';

/**
 * usePermissionGuard Hook
 * 返回一个高阶组件，用于包装需要权限控制的组件
 *
 * @example
 * const withPermission = usePermissionGuard();
 *
 * const ProtectedButton = withPermission(
 *   <Button>Delete</Button>,
 *   { permission: 'user:delete' }
 * );
 */
export const usePermissionGuard = () => {
  return useCallback(
    (
      component: React.ReactNode,
      options: {
        permission?: string;
        anyOf?: string[];
        allOf?: string[];
        fallback?: React.ReactNode;
      }
    ) => {
      return <PermissionGuard {...options}>{component}</PermissionGuard>;
    },
    []
  );
};

export default usePermission;
