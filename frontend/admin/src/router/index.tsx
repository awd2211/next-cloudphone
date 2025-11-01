import React, { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Spin } from 'antd';

// Layout 和 Login 保持同步导入(首屏必需)
import Layout from '@/layouts/BasicLayout';
import Login from '@/pages/Login';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminRoute } from '@/components/AdminRoute';

// 使用 React.lazy 懒加载所有页面组件
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const DeviceList = lazy(() => import('@/pages/Device/List'));
const DeviceDetail = lazy(() => import('@/pages/Device/Detail'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const UserList = lazy(() => import('@/pages/User/List'));
const AppList = lazy(() => import('@/pages/App/List'));
const OrderList = lazy(() => import('@/pages/Order/List'));
const PlanList = lazy(() => import('@/pages/Plan/List'));
const RevenueReport = lazy(() => import('@/pages/Report/Revenue'));
const Analytics = lazy(() => import('@/pages/Report/Analytics'));
const UsageList = lazy(() => import('@/pages/Usage/List'));
const PaymentList = lazy(() => import('@/pages/Payment/List'));
const PaymentDashboard = lazy(() => import('@/pages/Payment/Dashboard'));
const RefundManagement = lazy(() => import('@/pages/Payment/RefundManagement'));
const PaymentConfig = lazy(() => import('@/pages/Payment/Config'));
const WebhookLogs = lazy(() => import('@/pages/Payment/WebhookLogs'));
const ExceptionPayments = lazy(() => import('@/pages/Payment/ExceptionPayments'));
const RoleList = lazy(() => import('@/pages/Role/List'));
const PermissionList = lazy(() => import('@/pages/Permission/List'));
const DataScopeConfig = lazy(() => import('@/pages/Permission/DataScope'));
const FieldPermissionConfig = lazy(() => import('@/pages/Permission/FieldPermission'));
const MenuPermissionConfig = lazy(() => import('@/pages/Permission/MenuPermission'));
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

// 设备模板和快照
const TemplateList = lazy(() => import('@/pages/Template/List'));
const SnapshotList = lazy(() => import('@/pages/Snapshot/List'));
const PhysicalDeviceList = lazy(() => import('@/pages/PhysicalDevice/List'));

// 应用审核
const AppReviewList = lazy(() => import('@/pages/AppReview/ReviewList'));
const AppReviewDetail = lazy(() => import('@/pages/AppReview/ReviewDetail'));

// 计量仪表板
const MeteringDashboard = lazy(() => import('@/pages/Metering/Dashboard'));

// 计费规则
const BillingRuleList = lazy(() => import('@/pages/BillingRules/List'));

// 调度器仪表板
const SchedulerDashboard = lazy(() => import('@/pages/Scheduler/Dashboard'));

// P2 页面 - 生命周期自动化
const LifecycleDashboard = lazy(() => import('@/pages/DeviceLifecycle/Dashboard'));

// P2 页面 - GPU 资源管理
const GPUDashboard = lazy(() => import('@/pages/GPU/Dashboard'));

// P2 页面 - 通知模板编辑器
const NotificationTemplateEditor = lazy(() => import('@/pages/NotificationTemplates/Editor'));
const NotificationTemplatesList = lazy(() => import('@/pages/NotificationTemplates/List'));

// P2 页面 - 系统管理
const CacheManagement = lazy(() => import('@/pages/System/CacheManagement'));
const QueueManagement = lazy(() => import('@/pages/System/QueueManagement'));
const EventSourcingViewer = lazy(() => import('@/pages/System/EventSourcingViewer'));
const ConsulMonitor = lazy(() => import('@/pages/System/ConsulMonitor'));
const PrometheusMonitor = lazy(() => import('@/pages/System/PrometheusMonitor'));

// P2 页面 - 设备高级功能
const DeviceGroupManagement = lazy(() => import('@/pages/DeviceGroups/Management'));
const NetworkPolicyConfiguration = lazy(() => import('@/pages/NetworkPolicy/Configuration'));

// SMS 管理
const SMSManagement = lazy(() => import('@/pages/SMS/Management'));

// 统计仪表板
// 🔄 临时注释（缺少 recharts 依赖）- Week 2 恢复
// const StatsDashboard = lazy(() => import('@/pages/Stats/Dashboard'));

// 故障转移管理
const FailoverManagement = lazy(() => import('@/pages/Failover/Management'));

// 状态恢复管理
const StateRecoveryManagement = lazy(() => import('@/pages/StateRecovery/Management'));

// ✅ 导入优化的页面加载骨架屏
import { PageLoadingSkeleton } from '@/components/PageLoadingSkeleton';

// ✅ Suspense 包裹组件（使用骨架屏替代 Spin）
const withSuspense = (Component: React.LazyExoticComponent<React.ComponentType<any>>) => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoadingSkeleton />}>
      <Component />
    </Suspense>
  </ErrorBoundary>
);

// ✅ 管理员路由包裹（使用骨架屏）
const withAdminRoute = (
  Component: React.LazyExoticComponent<React.ComponentType<any>>,
  requireSuperAdmin = false
) => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoadingSkeleton />}>
      <AdminRoute requireSuperAdmin={requireSuperAdmin} showForbidden>
        <Component />
      </AdminRoute>
    </Suspense>
  </ErrorBoundary>
);

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <ErrorBoundary>
        <Login />
      </ErrorBoundary>
    ),
  },
  {
    path: '/',
    element: (
      <ErrorBoundary>
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      </ErrorBoundary>
    ),
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
        path: 'templates',
        element: withSuspense(TemplateList),
      },
      {
        path: 'snapshots',
        element: withSuspense(SnapshotList),
      },
      {
        path: 'physical-devices',
        element: withSuspense(PhysicalDeviceList),
      },
      {
        path: 'users',
        element: withAdminRoute(UserList), // Admin only
      },
      {
        path: 'apps',
        element: withSuspense(AppList),
      },
      {
        path: 'app-review',
        element: withAdminRoute(AppReviewList), // Admin only
      },
      {
        path: 'app-review/:id',
        element: withAdminRoute(AppReviewDetail), // Admin only
      },
      {
        path: 'metering',
        element: withSuspense(MeteringDashboard),
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
        path: 'payments/dashboard',
        element: withSuspense(PaymentDashboard),
      },
      {
        path: 'payments/refunds',
        element: withSuspense(RefundManagement),
      },
      {
        path: 'payments/config',
        element: withSuspense(PaymentConfig),
      },
      {
        path: 'payments/webhooks',
        element: withSuspense(WebhookLogs),
      },
      {
        path: 'payments/exceptions',
        element: withSuspense(ExceptionPayments),
      },
      {
        path: 'roles',
        element: withAdminRoute(RoleList), // Admin only
      },
      {
        path: 'permissions',
        element: withAdminRoute(PermissionList), // Admin only
      },
      {
        path: 'permissions/data-scope',
        element: withAdminRoute(DataScopeConfig), // Admin only
      },
      {
        path: 'permissions/field-permission',
        element: withAdminRoute(FieldPermissionConfig), // Admin only
      },
      {
        path: 'permissions/menu',
        element: withAdminRoute(MenuPermissionConfig), // Admin only
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
      {
        path: 'billing/rules',
        element: withSuspense(BillingRuleList),
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
      // 调度器管理
      {
        path: 'scheduler',
        element: withSuspense(SchedulerDashboard),
      },
      // 生命周期自动化
      {
        path: 'devices/lifecycle',
        element: withSuspense(LifecycleDashboard),
      },
      // GPU 资源管理
      {
        path: 'resources/gpu',
        element: withSuspense(GPUDashboard),
      },
      // 通知模板管理
      {
        path: 'notifications/templates',
        element: withAdminRoute(NotificationTemplatesList), // Admin only
      },
      // 通知模板编辑器
      {
        path: 'notifications/templates/editor',
        element: withSuspense(NotificationTemplateEditor),
      },
      // 系统管理 - Super Admin only
      {
        path: 'system/cache',
        element: withAdminRoute(CacheManagement, true), // Super Admin only
      },
      {
        path: 'system/queue',
        element: withAdminRoute(QueueManagement, true), // Super Admin only
      },
      {
        path: 'system/events',
        element: withAdminRoute(EventSourcingViewer, true), // Super Admin only
      },
      {
        path: 'system/consul',
        element: withAdminRoute(ConsulMonitor, true), // Super Admin only
      },
      {
        path: 'system/monitoring',
        element: withAdminRoute(PrometheusMonitor, true), // Super Admin only
      },
      // 设备高级功能
      {
        path: 'devices/groups',
        element: withSuspense(DeviceGroupManagement),
      },
      {
        path: 'devices/network-policies',
        element: withSuspense(NetworkPolicyConfiguration),
      },
      // SMS 管理
      {
        path: 'sms',
        element: withSuspense(SMSManagement),
      },
      // 统计仪表板
      // 🔄 临时注释（缺少 recharts 依赖）- Week 2 恢复
      // {
      //   path: 'stats',
      //   element: withSuspense(StatsDashboard),
      // },
      // 故障转移管理
      {
        path: 'devices/failover',
        element: withSuspense(FailoverManagement),
      },
      // 状态恢复管理
      {
        path: 'devices/state-recovery',
        element: withSuspense(StateRecoveryManagement),
      },
    ],
  },
  {
    path: '*',
    element: withSuspense(NotFound),
  },
]);
