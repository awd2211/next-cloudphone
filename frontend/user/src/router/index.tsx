import { createBrowserRouter } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import PlanPurchase from '@/pages/PlanPurchase';
import MyDevices from '@/pages/MyDevices';
import MyOrders from '@/pages/MyOrders';
import Profile from '@/pages/Profile';

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
        path: 'orders',
        element: <MyOrders />,
      },
      {
        path: 'profile',
        element: <Profile />,
      },
    ],
  },
]);
