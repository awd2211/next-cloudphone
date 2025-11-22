import React, { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Spin } from 'antd';

// Layout 和 Login 保持同步导入(首屏必需)
import MainLayout from '@/layouts/MainLayout';
import PublicLayout from '@/layouts/PublicLayout';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import SecurityCenter from '@/pages/SecurityCenter';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ProtectedRoute } from '@/components/ProtectedRoute';

// 社交登录回调（懒加载）
const SocialAuthCallback = lazy(() => import('@/pages/Auth/SocialAuthCallback'));

// 使用 React.lazy 懒加载所有页面组件
const Home = lazy(() => import('@/pages/Home'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const PlanPurchase = lazy(() => import('@/pages/PlanPurchase'));
const MyDevices = lazy(() => import('@/pages/MyDevices'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const DeviceDetail = lazy(() => import('@/pages/DeviceDetail'));
const DeviceMonitor = lazy(() => import('@/pages/DeviceMonitor'));
const DeviceSnapshots = lazy(() => import('@/pages/DeviceSnapshots'));
const DeviceTemplates = lazy(() => import('@/pages/DeviceTemplates'));
const ApiKeys = lazy(() => import('@/pages/ApiKeys'));
const AccountBalance = lazy(() => import('@/pages/AccountBalance'));
const MyOrders = lazy(() => import('@/pages/MyOrders'));
const Profile = lazy(() => import('@/pages/Profile'));
const ProfilePreferences = lazy(() => import('@/pages/ProfilePreferences'));
const PaymentMethods = lazy(() => import('@/pages/PaymentMethods'));
const AppMarket = lazy(() => import('@/pages/AppMarket'));
const AppDetail = lazy(() => import('@/pages/AppDetail'));
const InstalledApps = lazy(() => import('@/pages/InstalledApps'));
const Recharge = lazy(() => import('@/pages/Recharge'));
const UsageRecords = lazy(() => import('@/pages/UsageRecords'));
const TicketList = lazy(() => import('@/pages/Tickets/TicketList'));
const TicketDetail = lazy(() => import('@/pages/Tickets/TicketDetail'));
const MessageList = lazy(() => import('@/pages/Messages/MessageList'));
const MessageSettings = lazy(() => import('@/pages/Messages/MessageSettings'));
const SMSVerification = lazy(() => import('@/pages/Messages/SMSVerification'));
const MyProxies = lazy(() => import('@/pages/Proxy/MyProxies'));
const HelpCenter = lazy(() => import('@/pages/Help/HelpCenter'));
const FAQList = lazy(() => import('@/pages/Help/FAQList'));
const TutorialList = lazy(() => import('@/pages/Help/TutorialList'));
const TutorialDetail = lazy(() => import('@/pages/Help/TutorialDetail'));
const ExportCenter = lazy(() => import('@/pages/DataExport/ExportCenter'));
const BillList = lazy(() => import('@/pages/Billing/BillList'));
const BillDetail = lazy(() => import('@/pages/Billing/BillDetail'));
const InvoiceList = lazy(() => import('@/pages/Invoices/InvoiceList'));
const ActivityCenter = lazy(() => import('@/pages/Activities/ActivityCenter'));
const ActivityDetail = lazy(() => import('@/pages/Activities/ActivityDetail'));
const MyCoupons = lazy(() => import('@/pages/Activities/MyCoupons'));
const ReferralCenter = lazy(() => import('@/pages/Referral/ReferralCenter'));
const ReferralRecords = lazy(() => import('@/pages/Referral/ReferralRecords'));

// 法律合规页面（不需要登录）
const TermsOfService = lazy(() => import('@/pages/Legal/TermsOfService'));
const PrivacyPolicy = lazy(() => import('@/pages/Legal/PrivacyPolicy'));
const ServiceLevelAgreement = lazy(() => import('@/pages/Legal/ServiceLevelAgreement'));
const RefundPolicy = lazy(() => import('@/pages/Legal/RefundPolicy'));
const SecurityPage = lazy(() => import('@/pages/Legal/Security'));
const DynamicLegal = lazy(() => import('@/pages/Legal/DynamicLegal'));

// 营销页面（不需要登录）
const Product = lazy(() => import('@/pages/Product'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const Solutions = lazy(() => import('@/pages/Solutions'));
const CaseStudies = lazy(() => import('@/pages/CaseStudies'));

// 产品功能页面（不需要登录）
const CloudDeviceManagement = lazy(() => import('@/pages/Products/CloudDeviceManagement'));
const ProductAppMarket = lazy(() => import('@/pages/Products/AppMarket'));
const AutomationTools = lazy(() => import('@/pages/Products/AutomationTools'));
const OpenAPI = lazy(() => import('@/pages/Products/OpenAPI'));
const ResidentialProxy = lazy(() => import('@/pages/Products/ResidentialProxy'));
const SMSReception = lazy(() => import('@/pages/Products/SMSReception'));

// 行业方案页面（不需要登录）
const GamingHosting = lazy(() => import('@/pages/Solutions/GamingHosting'));
const AppTesting = lazy(() => import('@/pages/Solutions/AppTesting'));
const EcommerceOperations = lazy(() => import('@/pages/Solutions/EcommerceOperations'));
const SocialMedia = lazy(() => import('@/pages/Solutions/SocialMedia'));

// 公司信息页面（不需要登录）
const About = lazy(() => import('@/pages/About'));
const Contact = lazy(() => import('@/pages/Contact'));
const Careers = lazy(() => import('@/pages/Careers'));

// Loading 组件
const PageLoading = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '400px',
    }}
  >
    <Spin size="large" />
  </div>
);

// Suspense 包裹组件（同时包裹 ErrorBoundary）
const withSuspense = (Component: React.LazyExoticComponent<React.ComponentType<any>>) => (
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
        <Login />
      </ErrorBoundary>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <ErrorBoundary>
        <ForgotPassword />
      </ErrorBoundary>
    ),
  },
  {
    path: '/reset-password/:token',
    element: (
      <ErrorBoundary>
        <ResetPassword />
      </ErrorBoundary>
    ),
  },
  // 社交登录回调路由
  {
    path: '/auth/callback/:provider',
    element: withSuspense(SocialAuthCallback),
  },
  // 公共页面路由（使用 PublicLayout，包含 Header 和 Footer）
  {
    element: (
      <ErrorBoundary>
        <PublicLayout />
      </ErrorBoundary>
    ),
    children: [
      // 首页
      {
        path: '/',
        element: withSuspense(Home),
      },
      // 营销页面
      {
        path: '/product',
        element: withSuspense(Product),
      },
      {
        path: '/pricing',
        element: withSuspense(Pricing),
      },
      {
        path: '/solutions',
        element: withSuspense(Solutions),
      },
      {
        path: '/case-studies',
        element: withSuspense(CaseStudies),
      },
      // 产品功能页面
      {
        path: '/products/cloud-device-management',
        element: withSuspense(CloudDeviceManagement),
      },
      {
        path: '/products/app-market',
        element: withSuspense(ProductAppMarket),
      },
      {
        path: '/products/automation-tools',
        element: withSuspense(AutomationTools),
      },
      {
        path: '/products/open-api',
        element: withSuspense(OpenAPI),
      },
      {
        path: '/products/residential-proxy',
        element: withSuspense(ResidentialProxy),
      },
      {
        path: '/products/sms-reception',
        element: withSuspense(SMSReception),
      },
      // 行业方案页面
      {
        path: '/solutions/gaming-hosting',
        element: withSuspense(GamingHosting),
      },
      {
        path: '/solutions/app-testing',
        element: withSuspense(AppTesting),
      },
      {
        path: '/solutions/ecommerce-operations',
        element: withSuspense(EcommerceOperations),
      },
      {
        path: '/solutions/social-media',
        element: withSuspense(SocialMedia),
      },
      // 公司信息页面
      {
        path: '/about',
        element: withSuspense(About),
      },
      {
        path: '/contact',
        element: withSuspense(Contact),
      },
      {
        path: '/careers',
        element: withSuspense(Careers),
      },
      // 帮助中心（公开访问）
      {
        path: '/help',
        element: withSuspense(HelpCenter),
      },
      {
        path: '/help/faqs',
        element: withSuspense(FAQList),
      },
      {
        path: '/help/tutorials',
        element: withSuspense(TutorialList),
      },
      {
        path: '/help/tutorials/:id',
        element: withSuspense(TutorialDetail),
      },
      // 法律合规页面（静态回退页面，CMS 加载失败时使用）
      {
        path: '/legal/terms',
        element: withSuspense(TermsOfService),
      },
      {
        path: '/legal/privacy',
        element: withSuspense(PrivacyPolicy),
      },
      {
        path: '/legal/sla',
        element: withSuspense(ServiceLevelAgreement),
      },
      {
        path: '/legal/refund',
        element: withSuspense(RefundPolicy),
      },
      {
        path: '/legal/security',
        element: withSuspense(SecurityPage),
      },
      // 动态法律文档（从 CMS API 加载）
      {
        path: '/legal/:type',
        element: withSuspense(DynamicLegal),
      },
    ],
  },
  // 认证后的路由（需要登录）
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
        path: '/plans/:id/purchase',
        element: withSuspense(PlanPurchase),
      },
      {
        path: '/devices',
        element: withSuspense(MyDevices),
      },
      {
        path: '/devices/:id',
        element: withSuspense(DeviceDetail),
      },
      {
        path: '/devices/:id/monitor',
        element: withSuspense(DeviceMonitor),
      },
      {
        path: '/devices/:id/snapshots',
        element: withSuspense(DeviceSnapshots),
      },
      {
        path: '/device-templates',
        element: withSuspense(DeviceTemplates),
      },
      {
        path: '/orders',
        element: withSuspense(MyOrders),
      },
      {
        path: '/profile',
        element: withSuspense(Profile),
      },
      {
        path: '/profile/preferences',
        element: withSuspense(ProfilePreferences),
      },
      {
        path: '/security',
        element: (
          <ErrorBoundary>
            <SecurityCenter />
          </ErrorBoundary>
        ),
      },
      {
        path: '/profile/payment-methods',
        element: withSuspense(PaymentMethods),
      },
      {
        path: '/apps',
        element: withSuspense(AppMarket),
      },
      {
        path: '/apps/:id',
        element: withSuspense(AppDetail),
      },
      {
        path: '/installed-apps',
        element: withSuspense(InstalledApps),
      },
      {
        path: '/recharge',
        element: withSuspense(Recharge),
      },
      {
        path: '/usage',
        element: withSuspense(UsageRecords),
      },
      {
        path: '/tickets',
        element: withSuspense(TicketList),
      },
      {
        path: '/tickets/:id',
        element: withSuspense(TicketDetail),
      },
      {
        path: '/messages',
        element: withSuspense(MessageList),
      },
      {
        path: '/messages/settings',
        element: withSuspense(MessageSettings),
      },
      {
        path: '/messages/sms',
        element: withSuspense(SMSVerification),
      },
      {
        path: '/proxy',
        element: withSuspense(MyProxies),
      },
      {
        path: '/export',
        element: withSuspense(ExportCenter),
      },
      {
        path: '/api-keys',
        element: withSuspense(ApiKeys),
      },
      {
        path: '/billing',
        element: withSuspense(BillList),
      },
      {
        path: '/billing/:id',
        element: withSuspense(BillDetail),
      },
      {
        path: '/billing/balance',
        element: withSuspense(AccountBalance),
      },
      {
        path: '/invoices',
        element: withSuspense(InvoiceList),
      },
      {
        path: '/activities',
        element: withSuspense(ActivityCenter),
      },
      {
        path: '/activities/:id',
        element: withSuspense(ActivityDetail),
      },
      {
        path: '/activities/coupons',
        element: withSuspense(MyCoupons),
      },
      {
        path: '/referral',
        element: withSuspense(ReferralCenter),
      },
      {
        path: '/referral/records',
        element: withSuspense(ReferralRecords),
      },
    ],
  },
  {
    path: '*',
    element: withSuspense(NotFound),
  },
]);
