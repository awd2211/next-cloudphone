import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

/**
 * 路由守卫组件
 *
 * 功能：
 * - 检查用户是否已登录
 * - 检查用户是否有所需权限
 * - 未登录用户重定向到登录页
 * - 无权限用户显示 403 页面
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredPermission }) => {
  // 检查是否已登录
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token;

  if (!isAuthenticated) {
    // 未登录，重定向到登录页
    return <Navigate to="/login" replace />;
  }

  // 如果需要特定权限
  if (requiredPermission) {
    // 从 localStorage 或 store 中获取用户权限
    const userPermissionsStr = localStorage.getItem('permissions');
    const userPermissions: string[] = userPermissionsStr ? JSON.parse(userPermissionsStr) : [];

    const hasPermission = userPermissions.includes(requiredPermission);

    if (!hasPermission) {
      // 无权限，返回 403 页面
      return (
        <div style={{ textAlign: 'center', padding: '100px 0' }}>
          <h1>403</h1>
          <p>您没有权限访问此页面</p>
        </div>
      );
    }
  }

  // 已登录且有权限，渲染子组件
  return <>{children}</>;
};
