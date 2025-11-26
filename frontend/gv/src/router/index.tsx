import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Spin } from 'antd';

import MainLayout from '@/layouts/MainLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// 懒加载页面
const Login = lazy(() => import('@/pages/Login'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const DeviceList = lazy(() => import('@/pages/Device/List'));
const DeviceControl = lazy(() => import('@/pages/Device/Control'));
const ProxyList = lazy(() => import('@/pages/Proxy/List'));
const SMSList = lazy(() => import('@/pages/SMS/List'));
const Settings = lazy(() => import('@/pages/Settings'));
const NotFound = lazy(() => import('@/pages/NotFound'));

// 页面加载组件
const PageLoading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
    <Spin size="large" tip="加载中..." />
  </div>
);

// 带 Suspense 的组件包裹
const withSuspense = (Component: React.LazyExoticComponent<React.ComponentType<unknown>>) => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoading />}>
      <Component />
    </Suspense>
  </ErrorBoundary>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <ErrorBoundary>
        <Suspense fallback={<PageLoading />}>
          <Login />
        </Suspense>
      </ErrorBoundary>
    ),
  },
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    element: (
      <ErrorBoundary>
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      </ErrorBoundary>
    ),
    children: [
      {
        path: '/dashboard',
        element: withSuspense(Dashboard),
      },
      {
        path: '/devices',
        element: withSuspense(DeviceList),
      },
      {
        path: '/control',
        element: withSuspense(DeviceControl),
      },
      {
        path: '/proxy',
        element: withSuspense(ProxyList),
      },
      {
        path: '/sms',
        element: withSuspense(SMSList),
      },
      {
        path: '/settings',
        element: withSuspense(Settings),
      },
    ],
  },
  {
    path: '*',
    element: withSuspense(NotFound),
  },
]);
