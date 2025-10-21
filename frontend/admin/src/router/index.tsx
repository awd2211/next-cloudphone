import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/layouts/BasicLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import DeviceList from '@/pages/Device/List';
import DeviceDetail from '@/pages/Device/Detail';
import UserList from '@/pages/User/List';
import AppList from '@/pages/App/List';
import OrderList from '@/pages/Order/List';
import PlanList from '@/pages/Plan/List';
import RevenueReport from '@/pages/Report/Revenue';
import Analytics from '@/pages/Report/Analytics';
import UsageList from '@/pages/Usage/List';
import PaymentList from '@/pages/Payment/List';
import RoleList from '@/pages/Role/List';
import PermissionList from '@/pages/Permission/List';
import Settings from '@/pages/Settings';
import AuditLogList from '@/pages/Logs/Audit';
import NotificationCenter from '@/pages/Notifications';
import Profile from '@/pages/Profile';

// 新增页面导入
import QuotaList from '@/pages/Quota/QuotaList';
import AnalyticsDashboard from '@/pages/Analytics/Dashboard';
import BalanceOverview from '@/pages/Billing/BalanceOverview';
import TransactionHistory from '@/pages/Billing/TransactionHistory';
import InvoiceList from '@/pages/Billing/InvoiceList';
import TicketList from '@/pages/Ticket/TicketList';
import TicketDetail from '@/pages/Ticket/TicketDetail';
import AuditLog from '@/pages/Audit/AuditLogList';
import ApiKeyList from '@/pages/ApiKey/ApiKeyList';

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
        element: <Dashboard />,
      },
      {
        path: 'devices',
        element: <DeviceList />,
      },
      {
        path: 'devices/:id',
        element: <DeviceDetail />,
      },
      {
        path: 'users',
        element: <UserList />,
      },
      {
        path: 'apps',
        element: <AppList />,
      },
      {
        path: 'orders',
        element: <OrderList />,
      },
      {
        path: 'plans',
        element: <PlanList />,
      },
      {
        path: 'reports/revenue',
        element: <RevenueReport />,
      },
      {
        path: 'reports/analytics',
        element: <Analytics />,
      },
      {
        path: 'usage',
        element: <UsageList />,
      },
      {
        path: 'payments',
        element: <PaymentList />,
      },
      {
        path: 'roles',
        element: <RoleList />,
      },
      {
        path: 'permissions',
        element: <PermissionList />,
      },
      {
        path: 'settings',
        element: <Settings />,
      },
      {
        path: 'logs/audit',
        element: <AuditLogList />,
      },
      {
        path: 'notifications',
        element: <NotificationCenter />,
      },
      {
        path: 'profile',
        element: <Profile />,
      },
      // 配额管理
      {
        path: 'quotas',
        element: <QuotaList />,
      },
      // 数据分析
      {
        path: 'analytics',
        element: <AnalyticsDashboard />,
      },
      // 账单管理
      {
        path: 'billing/balance',
        element: <BalanceOverview />,
      },
      {
        path: 'billing/transactions',
        element: <TransactionHistory />,
      },
      {
        path: 'billing/invoices',
        element: <InvoiceList />,
      },
      // 工单系统
      {
        path: 'tickets',
        element: <TicketList />,
      },
      {
        path: 'tickets/:id',
        element: <TicketDetail />,
      },
      // 审计日志（新路径）
      {
        path: 'audit-logs',
        element: <AuditLog />,
      },
      // API 密钥管理
      {
        path: 'api-keys',
        element: <ApiKeyList />,
      },
    ],
  },
]);
