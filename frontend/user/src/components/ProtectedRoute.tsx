import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * 路由守卫组件
 *
 * 功能：
 * - 检查用户是否已登录
 * - 未登录用户重定向到登录页
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  // 检查是否已登录
  const token = localStorage.getItem('token');
  const isAuthenticated = !!token;

  if (!isAuthenticated) {
    // 未登录，重定向到登录页
    return <Navigate to="/login" replace />;
  }

  // 已登录，渲染子组件
  return <>{children}</>;
};
