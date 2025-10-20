import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import PlanPurchase from '@/pages/PlanPurchase';
import MyDevices from '@/pages/MyDevices';
import DeviceDetail from '@/pages/DeviceDetail';
import MyOrders from '@/pages/MyOrders';
import Profile from '@/pages/Profile';
import AppMarket from '@/pages/AppMarket';
import Recharge from '@/pages/Recharge';
import UsageRecords from '@/pages/UsageRecords';

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
        element: <Home />,
      },
      {
        path: 'plans/:id/purchase',
        element: <PlanPurchase />,
      },
      {
        path: 'devices',
        element: <MyDevices />,
      },
      {
        path: 'devices/:id',
        element: <DeviceDetail />,
      },
      {
        path: 'orders',
        element: <MyOrders />,
      },
      {
        path: 'profile',
        element: <Profile />,
      },
      {
        path: 'apps',
        element: <AppMarket />,
      },
      {
        path: 'recharge',
        element: <Recharge />,
      },
      {
        path: 'usage',
        element: <UsageRecords />,
      },
    ],
  },
]);
