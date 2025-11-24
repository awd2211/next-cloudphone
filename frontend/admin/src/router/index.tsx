import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// Layout 和 Login 保持同步导入(首屏必需)
import Layout from '@/layouts/BasicLayout';
import Login from '@/pages/Login';
// 注意：ErrorBoundary 已移至 App.tsx 级别，这里不再需要
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
const UsageMonitor = lazy(() => import('@/pages/Usage/UsageMonitor'));
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
const SMSManagement = lazy(() => import('@/pages/SMS/SMSManagement'));
const SMSProviderConfig = lazy(() => import('@/pages/SMS/ProviderConfig'));

// 测试工具
const AdbConnectionTest = lazy(() => import('@/pages/Test/AdbConnectionTest'));

// 代理IP管理
const ProxyManagement = lazy(() => import('@/pages/Proxy/ProxyManagement'));
const ProxyProviderConfig = lazy(() => import('@/pages/Proxy/ProviderConfig'));

// 统计仪表板
const StatsDashboard = lazy(() => import('@/pages/Stats/Dashboard'));

// 故障转移管理
const FailoverManagement = lazy(() => import('@/pages/Failover/Management'));

// 状态恢复管理
const StateRecoveryManagement = lazy(() => import('@/pages/StateRecovery/Management'));

// CMS 内容管理
const CmsManagement = lazy(() => import('@/pages/CMS/Management'));
const CmsPageContents = lazy(() => import('@/pages/CMS/PageContents'));
const CmsSiteSettings = lazy(() => import('@/pages/CMS/SiteSettings'));
const CmsJobPositions = lazy(() => import('@/pages/CMS/JobPositions'));
const CmsLegalDocuments = lazy(() => import('@/pages/CMS/LegalDocuments'));
const CmsCaseStudies = lazy(() => import('@/pages/CMS/CaseStudies'));
const CmsPricingPlans = lazy(() => import('@/pages/CMS/PricingPlans'));

// LiveChat 在线客服管理
const LiveChatWorkspace = lazy(() => import('@/pages/LiveChat/Workspace'));
const LiveChatAgentList = lazy(() => import('@/pages/LiveChat/Agents/List'));
const LiveChatGroupList = lazy(() => import('@/pages/LiveChat/Groups/List'));
const LiveChatQueueConfig = lazy(() => import('@/pages/LiveChat/Queues/List'));
const LiveChatCannedResponses = lazy(() => import('@/pages/LiveChat/CannedResponses/List'));
const LiveChatSensitiveWords = lazy(() => import('@/pages/LiveChat/SensitiveWords/List'));
const LiveChatConversations = lazy(() => import('@/pages/LiveChat/Conversations/List'));
const LiveChatAnalytics = lazy(() => import('@/pages/LiveChat/Analytics/Dashboard'));
const LiveChatKnowledgeBase = lazy(() => import('@/pages/LiveChat/KnowledgeBase/List'));
const LiveChatBlacklist = lazy(() => import('@/pages/LiveChat/Blacklist/List'));
const LiveChatMonitor = lazy(() => import('@/pages/LiveChat/QualityReview/Dashboard'));
const LiveChatBot = lazy(() => import('@/pages/LiveChat/Bot'));

// ✅ 导入优化的页面加载骨架屏
import { PageLoadingSkeleton } from '@/components/PageLoadingSkeleton';

/**
 * ✅ Suspense 包裹组件（使用骨架屏替代 Spin）
 *
 * 优化说明：
 * - 移除了重复的 ErrorBoundary（App 级别已有全局 ErrorBoundary）
 * - 仅保留 Suspense 用于懒加载
 */
const withSuspense = (Component: React.LazyExoticComponent<React.ComponentType<any>>) => (
  <Suspense fallback={<PageLoadingSkeleton />}>
    <Component />
  </Suspense>
);

/**
 * ✅ 管理员路由包裹（使用骨架屏）
 *
 * 优化说明：
 * - 移除了重复的 ErrorBoundary
 * - AdminRoute 放在 Suspense 外部，先检查权限再加载组件
 *   这样无权限用户不会先看到骨架屏再看到 403
 */
const withAdminRoute = (
  Component: React.LazyExoticComponent<React.ComponentType<any>>,
  requireSuperAdmin = false
) => (
  <AdminRoute requireSuperAdmin={requireSuperAdmin} showForbidden>
    <Suspense fallback={<PageLoadingSkeleton />}>
      <Component />
    </Suspense>
  </AdminRoute>
);

/**
 * 路由配置
 *
 * 嵌套结构优化说明：
 * - ErrorBoundary 仅在 App.tsx 级别保留一个（全局错误捕获）
 * - ProtectedRoute 负责认证检查
 * - AdminRoute 负责权限检查（放在 Suspense 外部，先检查权限）
 * - Suspense 负责懒加载
 *
 * 路由层次结构：
 * /admin                           # 管理后台根路径
 * ├── /admin/dashboard             # 工作台
 * ├── /admin/overview/*            # 数据总览
 * ├── /admin/business/*            # 业务管理 (设备、用户、应用)
 * ├── /admin/operations/*          # 运营管理 (订单、工单、客服)
 * ├── /admin/finance/*             # 财务管理 (账单、支付)
 * ├── /admin/devops/*              # 运维管理 (设备运维、服务运维)
 * └── /admin/system/*              # 系统管理 (权限、配置、日志)
 */
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  // 根路径重定向到 /admin/dashboard
  {
    path: '/',
    element: <Navigate to="/admin/dashboard" replace />,
  },
  {
    path: '/admin',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      // 默认重定向到仪表板
      {
        index: true,
        element: <Navigate to="/admin/dashboard" replace />,
      },
      // ==================== 工作台 ====================
      {
        path: 'dashboard',
        element: withSuspense(Dashboard),
      },

      // ==================== 数据总览 /admin/overview/* ====================
      {
        path: 'overview/analytics',
        element: withSuspense(AnalyticsDashboard),
      },
      {
        path: 'overview/stats',
        element: withSuspense(StatsDashboard),
      },
      {
        path: 'overview/reports/revenue',
        element: withSuspense(RevenueReport),
      },
      {
        path: 'overview/reports/analytics',
        element: withSuspense(Analytics),
      },

      // ==================== 业务管理 /admin/business/* ====================
      // --- 设备中心 ---
      {
        path: 'business/devices',
        element: withSuspense(DeviceList),
      },
      {
        path: 'business/devices/:id',
        element: withSuspense(DeviceDetail),
      },
      {
        path: 'business/devices/groups',
        element: withAdminRoute(DeviceGroupManagement),
      },
      {
        path: 'business/devices/templates',
        element: withAdminRoute(TemplateList),
      },
      {
        path: 'business/devices/snapshots',
        element: withAdminRoute(SnapshotList),
      },
      {
        path: 'business/devices/physical',
        element: withAdminRoute(PhysicalDeviceList),
      },
      // --- 用户中心 ---
      {
        path: 'business/users',
        element: withAdminRoute(UserList),
      },
      {
        path: 'business/users/quotas',
        element: withSuspense(QuotaList),
      },
      // --- 应用市场 ---
      {
        path: 'business/apps',
        element: withSuspense(AppList),
      },
      {
        path: 'business/apps/review',
        element: withAdminRoute(AppReviewList),
      },
      {
        path: 'business/apps/review/:id',
        element: withAdminRoute(AppReviewDetail),
      },

      // ==================== 运营管理 /admin/operations/* ====================
      // --- 商业运营 ---
      {
        path: 'operations/orders',
        element: withSuspense(OrderList),
      },
      {
        path: 'operations/plans',
        element: withSuspense(PlanList),
      },
      {
        path: 'operations/usage',
        element: withAdminRoute(UsageMonitor),
      },
      {
        path: 'operations/metering',
        element: withSuspense(MeteringDashboard),
      },
      // --- 工单服务 ---
      {
        path: 'operations/tickets',
        element: withSuspense(TicketList),
      },
      {
        path: 'operations/tickets/:id',
        element: withSuspense(TicketDetail),
      },
      // --- 在线客服 ---
      {
        path: 'operations/livechat/workspace',
        element: withSuspense(LiveChatWorkspace), // 客服工作台，不需要管理员权限
      },
      {
        path: 'operations/livechat/conversations',
        element: withAdminRoute(LiveChatConversations),
      },
      {
        path: 'operations/livechat/agents',
        element: withAdminRoute(LiveChatAgentList),
      },
      {
        path: 'operations/livechat/groups',
        element: withAdminRoute(LiveChatGroupList),
      },
      {
        path: 'operations/livechat/queues',
        element: withAdminRoute(LiveChatQueueConfig),
      },
      {
        path: 'operations/livechat/canned-responses',
        element: withAdminRoute(LiveChatCannedResponses),
      },
      {
        path: 'operations/livechat/sensitive-words',
        element: withAdminRoute(LiveChatSensitiveWords),
      },
      {
        path: 'operations/livechat/analytics',
        element: withAdminRoute(LiveChatAnalytics),
      },
      {
        path: 'operations/livechat/knowledge-base',
        element: withAdminRoute(LiveChatKnowledgeBase),
      },
      {
        path: 'operations/livechat/blacklist',
        element: withAdminRoute(LiveChatBlacklist),
      },
      {
        path: 'operations/livechat/monitor',
        element: withAdminRoute(LiveChatMonitor),
      },
      {
        path: 'operations/livechat/bot',
        element: withAdminRoute(LiveChatBot),
      },
      // --- CMS 内容管理 ---
      {
        path: 'operations/cms',
        element: <Navigate to="/admin/operations/cms/page-contents" replace />,
      },
      {
        path: 'operations/cms/page-contents',
        element: withAdminRoute(CmsPageContents),
      },
      {
        path: 'operations/cms/settings',
        element: withAdminRoute(CmsSiteSettings),
      },
      {
        path: 'operations/cms/jobs',
        element: withAdminRoute(CmsJobPositions),
      },
      {
        path: 'operations/cms/legal',
        element: withAdminRoute(CmsLegalDocuments),
      },
      {
        path: 'operations/cms/cases',
        element: withAdminRoute(CmsCaseStudies),
      },
      {
        path: 'operations/cms/pricing',
        element: withAdminRoute(CmsPricingPlans),
      },

      // ==================== 财务管理 /admin/finance/* ====================
      // --- 账务中心 ---
      {
        path: 'finance/billing/balance',
        element: withSuspense(BalanceOverview),
      },
      {
        path: 'finance/billing/transactions',
        element: withSuspense(TransactionHistory),
      },
      {
        path: 'finance/billing/invoices',
        element: withSuspense(InvoiceList),
      },
      {
        path: 'finance/billing/rules',
        element: withSuspense(BillingRuleList),
      },
      // --- 支付中心 ---
      {
        path: 'finance/payments/dashboard',
        element: withSuspense(PaymentDashboard),
      },
      {
        path: 'finance/payments',
        element: withSuspense(PaymentList),
      },
      {
        path: 'finance/payments/refunds',
        element: withSuspense(RefundManagement),
      },
      {
        path: 'finance/payments/exceptions',
        element: withSuspense(ExceptionPayments),
      },
      {
        path: 'finance/payments/webhooks',
        element: withSuspense(WebhookLogs),
      },
      {
        path: 'finance/payments/config',
        element: withSuspense(PaymentConfig),
      },

      // ==================== 运维管理 /admin/devops/* ====================
      // --- 设备运维 ---
      {
        path: 'devops/devices/lifecycle',
        element: withAdminRoute(LifecycleDashboard),
      },
      {
        path: 'devops/devices/failover',
        element: withAdminRoute(FailoverManagement),
      },
      {
        path: 'devops/devices/state-recovery',
        element: withAdminRoute(StateRecoveryManagement),
      },
      {
        path: 'devops/devices/network-policies',
        element: withAdminRoute(NetworkPolicyConfiguration),
      },
      // --- 服务运维 ---
      {
        path: 'devops/proxy',
        element: withSuspense(ProxyManagement),
      },
      {
        path: 'devops/proxy/providers',
        element: withSuspense(ProxyProviderConfig),
      },
      {
        path: 'devops/sms',
        element: withSuspense(SMSManagement),
      },
      {
        path: 'devops/sms/providers',
        element: withSuspense(SMSProviderConfig),
      },
      // --- 资源管理 ---
      {
        path: 'devops/resources/gpu',
        element: withSuspense(GPUDashboard),
      },
      {
        path: 'devops/scheduler',
        element: withSuspense(SchedulerDashboard),
      },

      // ==================== 系统管理 /admin/system/* ====================
      // --- 访问控制 ---
      {
        path: 'system/access/roles',
        element: withAdminRoute(RoleList),
      },
      {
        path: 'system/access/permissions',
        element: withAdminRoute(PermissionList),
      },
      {
        path: 'system/access/data-scope',
        element: withAdminRoute(DataScopeConfig),
      },
      {
        path: 'system/access/field-permission',
        element: withAdminRoute(FieldPermissionConfig),
      },
      {
        path: 'system/access/menu-permission',
        element: withAdminRoute(MenuPermissionConfig),
      },
      // --- 系统配置 ---
      {
        path: 'system/config/settings',
        element: withSuspense(Settings),
      },
      {
        path: 'system/config/notifications/templates',
        element: withAdminRoute(NotificationTemplatesList),
      },
      {
        path: 'system/config/notifications/templates/editor',
        element: withSuspense(NotificationTemplateEditor),
      },
      {
        path: 'system/config/api-keys',
        element: withSuspense(ApiKeyList),
      },
      // --- 监控与日志 ---
      {
        path: 'system/monitor/cache',
        element: withAdminRoute(CacheManagement, true),
      },
      {
        path: 'system/monitor/queue',
        element: withAdminRoute(QueueManagement, true),
      },
      {
        path: 'system/monitor/events',
        element: withAdminRoute(EventSourcingViewer, true),
      },
      {
        path: 'system/monitor/consul',
        element: withAdminRoute(ConsulMonitor, true),
      },
      {
        path: 'system/monitor/prometheus',
        element: withAdminRoute(PrometheusMonitor, true),
      },
      {
        path: 'system/logs/audit',
        element: withSuspense(AuditLog),
      },
      // --- 测试工具 ---
      {
        path: 'system/test/adb-connection',
        element: withAdminRoute(AdbConnectionTest),
      },
      // --- 用户相关 ---
      {
        path: 'notifications',
        element: withSuspense(NotificationCenter),
      },
      {
        path: 'profile',
        element: withSuspense(Profile),
      },
    ],
  },
  {
    path: '*',
    element: withSuspense(NotFound),
  },
]);
