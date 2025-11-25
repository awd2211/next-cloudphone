/**
 * 权限控制按钮组件
 *
 * 自动根据权限显示/隐藏按钮
 *
 * @example
 * ```tsx
 * <PermissionButton
 *   permission="device:create"
 *   type="primary"
 *   onClick={handleCreate}
 * >
 *   创建设备
 * </PermissionButton>
 * ```
 */

import React from 'react';
import { Button, Tooltip } from 'antd';
import type { ButtonProps } from 'antd';
import { usePermission } from '@/hooks/usePermission';

export interface PermissionButtonProps extends ButtonProps {
  /**
   * 需要的权限（单个）
   */
  permission?: string;

  /**
   * 需要的权限（多个，满足任意一个即可）
   */
  permissions?: string[];

  /**
   * 是否需要满足所有权限（当 permissions 为数组时）
   */
  requireAll?: boolean;

  /**
   * 没有权限时是否隐藏（默认 true）
   */
  hideWhenNoPermission?: boolean;

  /**
   * 没有权限时是否禁用（hideWhenNoPermission 为 false 时有效）
   */
  disableWhenNoPermission?: boolean;

  /**
   * 没有权限时的提示文本
   */
  noPermissionTooltip?: string;
}

/**
 * 权限控制按钮
 */
export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  permissions,
  requireAll = false,
  hideWhenNoPermission = true,
  disableWhenNoPermission = true,
  noPermissionTooltip = '您没有权限执行此操作',
  children,
  disabled,
  ...buttonProps
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermission();

  // 检查权限
  const hasAccess = React.useMemo(() => {
    if (permission) {
      return hasPermission(permission);
    }

    if (permissions && permissions.length > 0) {
      return requireAll
        ? hasAllPermissions(permissions)
        : hasAnyPermission(permissions);
    }

    // 没有指定权限，默认显示
    return true;
  }, [permission, permissions, requireAll, hasPermission, hasAnyPermission, hasAllPermissions]);

  // 没有权限且配置为隐藏
  if (!hasAccess && hideWhenNoPermission) {
    return null;
  }

  // 没有权限且配置为禁用
  const isDisabled = disabled || (!hasAccess && disableWhenNoPermission);

  const button = (
    <Button {...buttonProps} disabled={isDisabled}>
      {children}
    </Button>
  );

  // 没有权限时显示提示
  if (!hasAccess && !hideWhenNoPermission) {
    return (
      <Tooltip title={noPermissionTooltip}>
        {button}
      </Tooltip>
    );
  }

  return button;
};

export default PermissionButton;
