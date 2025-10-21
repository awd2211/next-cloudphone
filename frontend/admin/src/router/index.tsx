import React, { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Spin } from 'antd';

// Layout 和 Login 保持同步导入(首屏必需)
import Layout from '@/layouts/BasicLayout';
import Login from '@/pages/Login';

// 使用 React.lazy 懒加载所有页面组件
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const DeviceList = lazy(() => import('@/pages/Device/List'));
const DeviceDetail = lazy(() => import('@/pages/Device/Detail'));
const UserList = lazy(() => import('@/pages/User/List'));
const AppList = lazy(() => import('@/pages/App/List'));
const OrderList = lazy(() => import('@/pages/Order/List'));
const PlanList = lazy(() => import('@/pages/Plan/List'));
const RevenueReport = lazy(() => import('@/pages/Report/Revenue'));
const Analytics = lazy(() => import('@/pages/Report/Analytics'));
const UsageList = lazy(() => import('@/pages/Usage/List'));
const PaymentList = lazy(() => import('@/pages/Payment/List'));
const RoleList = lazy(() => import('@/pages/Role/List'));
const PermissionList = lazy(() => import('@/pages/Permission/List'));
const Settings = lazy(() => import('@/pages/Settings'));
const AuditLogList = lazy(() => import('@/pages/Logs/Audit'));
const NotificationCenter = lazy(() => import('@/pages/Notifications'));
const Profile = lazy(() => import('@/pages/Profile'));

// 新增页面 - 懒加载
const QuotaList = lazy(() => import('@/pages/Quota/QuotaList'));
const AnalyticsDashboard = lazy(() => import('@/pages/Analytics/Dashboard'));
const BalanceOverview = lazy(() => import('@/pages/Billing/BalanceOverview'));
const TransactionHistory = lazy(() => import('@/pages/Billing/TransactionHistory'));
const InvoiceList = lazy(() => import('@/pages/Billing/InvoiceList'));
const TicketList = lazy(() => import('@/pages/Ticket/TicketList'));
const TicketDetail = lazy(() => import('@/pages/Ticket/TicketDetail'));
const AuditLog = lazy(() => import('@/pages/Audit/AuditLogList'));
const ApiKeyList = lazy(() => import('@/pages/ApiKey/ApiKeyList'));

// Loading 组件
const PageLoading = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh'
  }}>
    <Spin size="large" tip="加载中..." />
  </div>
);

// Suspense 包裹组件
const withSuspense = (Component: React.LazyExoticComponent<React.ComponentType<any>>) => (
  <Suspense fallback={<PageLoading />}>
    <Component />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: withSuspense(Dashboard),
      },
      {
        path: 'devices',
        element: withSuspense(DeviceList),
      },
      {
        path: 'devices/:id',
        element: withSuspense(DeviceDetail),
      },
      {
        path: 'users',
        element: withSuspense(UserList),
      },
      {
        path: 'apps',
        element: withSuspense(AppList),
      },
      {
        path: 'orders',
        element: withSuspense(OrderList),
      },
      {
        path: 'plans',
        element: withSuspense(PlanList),
      },
      {
        path: 'reports/revenue',
        element: withSuspense(RevenueReport),
      },
      {
        path: 'reports/analytics',
        element: withSuspense(Analytics),
      },
      {
        path: 'usage',
        element: withSuspense(UsageList),
      },
      {
        path: 'payments',
        element: withSuspense(PaymentList),
      },
      {
        path: 'roles',
        element: withSuspense(RoleList),
      },
      {
        path: 'permissions',
        element: withSuspense(PermissionList),
      },
      {
        path: 'settings',
        element: withSuspense(Settings),
      },
      {
        path: 'logs/audit',
        element: withSuspense(AuditLogList),
      },
      {
        path: 'notifications',
        element: withSuspense(NotificationCenter),
      },
      {
        path: 'profile',
        element: withSuspense(Profile),
      },
      // 配额管理
      {
        path: 'quotas',
        element: withSuspense(QuotaList),
      },
      // 数据分析
      {
        path: 'analytics',
        element: withSuspense(AnalyticsDashboard),
      },
      // 账单管理
      {
        path: 'billing/balance',
        element: withSuspense(BalanceOverview),
      },
      {
        path: 'billing/transactions',
        element: withSuspense(TransactionHistory),
      },
      {
        path: 'billing/invoices',
        element: withSuspense(InvoiceList),
      },
      // 工单系统
      {
        path: 'tickets',
        element: withSuspense(TicketList),
      },
      {
        path: 'tickets/:id',
        element: withSuspense(TicketDetail),
      },
      // 审计日志（新路径）
      {
        path: 'audit-logs',
        element: withSuspense(AuditLog),
      },
      // API 密钥管理
      {
        path: 'api-keys',
        element: withSuspense(ApiKeyList),
      },
    ],
  },
]);
