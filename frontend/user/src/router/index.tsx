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
import TicketList from '@/pages/Tickets/TicketList';
import TicketDetail from '@/pages/Tickets/TicketDetail';
import MessageList from '@/pages/Messages/MessageList';
import MessageSettings from '@/pages/Messages/MessageSettings';
import HelpCenter from '@/pages/Help/HelpCenter';
import FAQList from '@/pages/Help/FAQList';
import TutorialList from '@/pages/Help/TutorialList';
import TutorialDetail from '@/pages/Help/TutorialDetail';
import ExportCenter from '@/pages/DataExport/ExportCenter';
import BillList from '@/pages/Billing/BillList';
import BillDetail from '@/pages/Billing/BillDetail';

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
      {
        path: 'tickets',
        element: <TicketList />,
      },
      {
        path: 'tickets/:id',
        element: <TicketDetail />,
      },
      {
        path: 'messages',
        element: <MessageList />,
      },
      {
        path: 'messages/settings',
        element: <MessageSettings />,
      },
      {
        path: 'help',
        element: <HelpCenter />,
      },
      {
        path: 'help/faqs',
        element: <FAQList />,
      },
      {
        path: 'help/tutorials',
        element: <TutorialList />,
      },
      {
        path: 'help/tutorials/:id',
        element: <TutorialDetail />,
      },
      {
        path: 'export',
        element: <ExportCenter />,
      },
      {
        path: 'billing',
        element: <BillList />,
      },
      {
        path: 'billing/:id',
        element: <BillDetail />,
      },
    ],
  },
]);
