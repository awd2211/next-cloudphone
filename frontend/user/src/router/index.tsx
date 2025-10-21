import React, { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Spin } from 'antd';

// Layout 和 Login 保持同步导入(首屏必需)
import MainLayout from '@/layouts/MainLayout';
import Login from '@/pages/Login';

// 使用 React.lazy 懒加载所有页面组件
const Home = lazy(() => import('@/pages/Home'));
const PlanPurchase = lazy(() => import('@/pages/PlanPurchase'));
const MyDevices = lazy(() => import('@/pages/MyDevices'));
const DeviceDetail = lazy(() => import('@/pages/DeviceDetail'));
const MyOrders = lazy(() => import('@/pages/MyOrders'));
const Profile = lazy(() => import('@/pages/Profile'));
const AppMarket = lazy(() => import('@/pages/AppMarket'));
const Recharge = lazy(() => import('@/pages/Recharge'));
const UsageRecords = lazy(() => import('@/pages/UsageRecords'));
const TicketList = lazy(() => import('@/pages/Tickets/TicketList'));
const TicketDetail = lazy(() => import('@/pages/Tickets/TicketDetail'));
const MessageList = lazy(() => import('@/pages/Messages/MessageList'));
const MessageSettings = lazy(() => import('@/pages/Messages/MessageSettings'));
const HelpCenter = lazy(() => import('@/pages/Help/HelpCenter'));
const FAQList = lazy(() => import('@/pages/Help/FAQList'));
const TutorialList = lazy(() => import('@/pages/Help/TutorialList'));
const TutorialDetail = lazy(() => import('@/pages/Help/TutorialDetail'));
const ExportCenter = lazy(() => import('@/pages/DataExport/ExportCenter'));
const BillList = lazy(() => import('@/pages/Billing/BillList'));
const BillDetail = lazy(() => import('@/pages/Billing/BillDetail'));
const ActivityCenter = lazy(() => import('@/pages/Activities/ActivityCenter'));
const ActivityDetail = lazy(() => import('@/pages/Activities/ActivityDetail'));
const MyCoupons = lazy(() => import('@/pages/Activities/MyCoupons'));
const ReferralCenter = lazy(() => import('@/pages/Referral/ReferralCenter'));
const ReferralRecords = lazy(() => import('@/pages/Referral/ReferralRecords'));

// Loading 组件
const PageLoading = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px'
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
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: withSuspense(Home),
      },
      {
        path: 'plans/:id/purchase',
        element: withSuspense(PlanPurchase),
      },
      {
        path: 'devices',
        element: withSuspense(MyDevices),
      },
      {
        path: 'devices/:id',
        element: withSuspense(DeviceDetail),
      },
      {
        path: 'orders',
        element: withSuspense(MyOrders),
      },
      {
        path: 'profile',
        element: withSuspense(Profile),
      },
      {
        path: 'apps',
        element: withSuspense(AppMarket),
      },
      {
        path: 'recharge',
        element: withSuspense(Recharge),
      },
      {
        path: 'usage',
        element: withSuspense(UsageRecords),
      },
      {
        path: 'tickets',
        element: withSuspense(TicketList),
      },
      {
        path: 'tickets/:id',
        element: withSuspense(TicketDetail),
      },
      {
        path: 'messages',
        element: withSuspense(MessageList),
      },
      {
        path: 'messages/settings',
        element: withSuspense(MessageSettings),
      },
      {
        path: 'help',
        element: withSuspense(HelpCenter),
      },
      {
        path: 'help/faqs',
        element: withSuspense(FAQList),
      },
      {
        path: 'help/tutorials',
        element: withSuspense(TutorialList),
      },
      {
        path: 'help/tutorials/:id',
        element: withSuspense(TutorialDetail),
      },
      {
        path: 'export',
        element: withSuspense(ExportCenter),
      },
      {
        path: 'billing',
        element: withSuspense(BillList),
      },
      {
        path: 'billing/:id',
        element: withSuspense(BillDetail),
      },
      {
        path: 'activities',
        element: withSuspense(ActivityCenter),
      },
      {
        path: 'activities/:id',
        element: withSuspense(ActivityDetail),
      },
      {
        path: 'activities/coupons',
        element: withSuspense(MyCoupons),
      },
      {
        path: 'referral',
        element: withSuspense(ReferralCenter),
      },
      {
        path: 'referral/records',
        element: withSuspense(ReferralRecords),
      },
    ],
  },
]);
