import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/layouts/BasicLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import DeviceList from '@/pages/Device/List';
import UserList from '@/pages/User/List';
import AppList from '@/pages/App/List';

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
    ],
  },
]);
