import { lazy, Suspense, ReactNode } from 'react';
import { RouteObject } from 'react-router-dom';
import { Spin } from 'antd';

/**
 * 懒加载包装器 - 统一的加载状态
 */
const LazyLoad = (Component: React.LazyExoticComponent<any>): ReactNode => {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <Spin size="large" />
          <div style={{ color: '#666' }}>加载中...</div>
        </div>
      }
    >
      <Component />
    </Suspense>
  );
};

// 懒加载所有页面组件
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Login = lazy(() => import('../pages/Login'));

// 设备管理
const DeviceList = lazy(() => import('../pages/Devices/DeviceListPage'));

// 用户管理
const UserList = lazy(() => import('../pages/User/List'));
const UserDetail = lazy(() => import('../pages/User/Detail'));

// 计费管理
const BillingDashboard = lazy(() => import('../pages/Billing/Dashboard'));

// 设置
const Settings = lazy(() => import('../pages/Settings'));

// 审计日志
const AuditLog = lazy(() => import('../pages/Audit/AuditLogList'));

/**
 * 懒加载路由配置
 * 注意: 这是一个示例配置,需要根据实际的路由结构调整
 */
export const lazyRoutes: RouteObject[] = [
  {
    path: '/login',
    element: LazyLoad(Login),
  },
  {
    path: '/',
    element: LazyLoad(Dashboard),
  },
  {
    path: '/devices',
    element: LazyLoad(DeviceList),
  },
  {
    path: '/users',
    element: LazyLoad(UserList),
  },
  {
    path: '/users/:userId',
    element: LazyLoad(UserDetail),
  },
  {
    path: '/billing',
    element: LazyLoad(BillingDashboard),
  },
  {
    path: '/settings',
    element: LazyLoad(Settings),
  },
  {
    path: '/audit',
    element: LazyLoad(AuditLog),
  },
];

export default lazyRoutes;
