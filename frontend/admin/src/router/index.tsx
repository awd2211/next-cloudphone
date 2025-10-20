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
import UsageList from '@/pages/Usage/List';
import PaymentList from '@/pages/Payment/List';
import RoleList from '@/pages/Role/List';
import PermissionList from '@/pages/Permission/List';

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
    ],
  },
]);
