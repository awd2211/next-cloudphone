import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/layouts/BasicLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import DeviceList from '@/pages/Device/List';
import UserList from '@/pages/User/List';
import AppList from '@/pages/App/List';
import OrderList from '@/pages/Order/List';
import PlanList from '@/pages/Plan/List';
import RevenueReport from '@/pages/Report/Revenue';
import UsageList from '@/pages/Usage/List';

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
    ],
  },
]);
