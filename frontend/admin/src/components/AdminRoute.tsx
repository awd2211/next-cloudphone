import React from 'react';
import { Navigate } from 'react-router-dom';
import { Result, Button } from 'antd';
import { useRole } from '@/hooks/useRole';

interface AdminRouteProps {
  children: React.ReactNode;
  /**
   * 是否需要超级管理员权限
   * @default false
   */
  requireSuperAdmin?: boolean;
  /**
   * 重定向路径（当用户无权限时）
   * @default '/dashboard'
   */
  redirectTo?: string;
  /**
   * 是否显示无权限页面而非重定向
   * @default false
   */
  showForbidden?: boolean;
}

/**
 * 管理员路由守卫组件
 *
 * 功能：
 * - 检查用户是否为管理员
 * - 可选：检查是否为超级管理员
 * - 非管理员用户重定向到仪表板或显示403页面
 *
 * @example
 * // 需要管理员权限
 * <AdminRoute>
 *   <UserManagement />
 * </AdminRoute>
 *
 * @example
 * // 需要超级管理员权限
 * <AdminRoute requireSuperAdmin>
 *   <SystemSettings />
 * </AdminRoute>
 *
 * @example
 * // 显示403页面而非重定向
 * <AdminRoute showForbidden>
 *   <SensitiveData />
 * </AdminRoute>
 */
export const AdminRoute: React.FC<AdminRouteProps> = ({
  children,
  requireSuperAdmin = false,
  redirectTo = '/',
  showForbidden = false,
}) => {
  const { isAdmin, isSuperAdmin, roleDisplayName } = useRole();

  // 检查权限
  const hasAccess = requireSuperAdmin ? isSuperAdmin : isAdmin;

  if (!hasAccess) {
    // 显示403页面
    if (showForbidden) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '80vh',
          }}
        >
          <Result
            status="403"
            title="403"
            subTitle={
              <>
                <p>抱歉，您没有权限访问此页面。</p>
                <p>
                  当前角色：<strong>{roleDisplayName}</strong>
                  {requireSuperAdmin && <span> （需要：超级管理员）</span>}
                  {!requireSuperAdmin && <span> （需要：管理员）</span>}
                </p>
              </>
            }
            extra={
              <Button type="primary" onClick={() => window.history.back()}>
                返回
              </Button>
            }
          />
        </div>
      );
    }

    // 重定向到指定路径
    return <Navigate to={redirectTo} replace />;
  }

  // 有权限，渲染子组件
  return <>{children}</>;
};
