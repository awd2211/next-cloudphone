/**
 * 权限包装组件
 *
 * 根据权限控制子组件的显示
 *
 * @example
 * ```tsx
 * <PermissionWrapper permission="device:create">
 *   <Button>创建设备</Button>
 * </PermissionWrapper>
 *
 * <PermissionWrapper permissions={['device:create', 'device:update']}>
 *   <DeviceForm />
 * </PermissionWrapper>
 * ```
 */

import React from 'react';
import { Result } from 'antd';
import { usePermission } from '@/hooks/usePermission';

export interface PermissionWrapperProps {
  /**
   * 需要的权限（单个）
   */
  permission?: string;

  /**
   * 需要的权限（多个）
   */
  permissions?: string[];

  /**
   * 是否需要满足所有权限（默认 false，满足任意一个即可）
   */
  requireAll?: boolean;

  /**
   * 需要的角色（单个）
   */
  role?: string;

  /**
   * 需要的角色（多个）
   */
  roles?: string[];

  /**
   * 没有权限时显示的内容
   */
  fallback?: React.ReactNode;

  /**
   * 没有权限时是否完全隐藏（不显示 fallback）
   */
  hideWhenNoPermission?: boolean;

  children: React.ReactNode;
}

/**
 * 权限包装组件
 */
export const PermissionWrapper: React.FC<PermissionWrapperProps> = ({
  permission,
  permissions,
  requireAll = false,
  role,
  roles,
  fallback,
  hideWhenNoPermission = false,
  children,
}) => {
  const {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
  } = usePermission();

  // 检查权限
  const hasAccess = React.useMemo(() => {
    // 检查角色
    if (role && !hasRole(role)) return false;
    if (roles && roles.length > 0 && !hasAnyRole(roles)) return false;

    // 检查权限
    if (permission && !hasPermission(permission)) return false;

    if (permissions && permissions.length > 0) {
      const hasRequiredPermissions = requireAll
        ? hasAllPermissions(permissions)
        : hasAnyPermission(permissions);

      if (!hasRequiredPermissions) return false;
    }

    return true;
  }, [
    permission,
    permissions,
    requireAll,
    role,
    roles,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
  ]);

  // 有权限，显示子组件
  if (hasAccess) {
    return <>{children}</>;
  }

  // 没有权限且配置为完全隐藏
  if (hideWhenNoPermission) {
    return null;
  }

  // 显示自定义的 fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // 默认的无权限提示
  return (
    <Result
      status="403"
      title="无权限访问"
      subTitle="抱歉，您没有权限访问此内容"
    />
  );
};

/**
 * 权限容器组件 - 简化版，只控制显示/隐藏
 */
export const PermissionContainer: React.FC<{
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  children: React.ReactNode;
}> = ({ permission, permissions, requireAll = false, children }) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();

  const hasAccess = React.useMemo(() => {
    if (permission) {
      return hasPermission(permission);
    }

    if (permissions && permissions.length > 0) {
      return requireAll
        ? hasAllPermissions(permissions)
        : hasAnyPermission(permissions);
    }

    return true;
  }, [permission, permissions, requireAll, hasPermission, hasAnyPermission, hasAllPermissions]);

  if (!hasAccess) {
    return null;
  }

  return <>{children}</>;
};

export default PermissionWrapper;
