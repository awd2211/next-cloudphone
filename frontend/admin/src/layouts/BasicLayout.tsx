import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Drawer } from 'antd';
import NotificationCenter from '@/components/NotificationCenter';
import {
  DashboardOutlined,
  MobileOutlined,
  UserOutlined,
  AppstoreOutlined,
  LogoutOutlined,
  ShoppingOutlined,
  GoldOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  CreditCardOutlined,
  SafetyOutlined,
  KeyOutlined,
  MenuOutlined,
  WalletOutlined,
  CustomerServiceOutlined,
  AuditOutlined,
  ApiOutlined,
  PieChartOutlined,
  DashboardFilled,
  SettingOutlined,
  BellOutlined,
  MailOutlined,
  MessageOutlined,
  AccountBookOutlined,
  TransactionOutlined,
  FileTextOutlined,
  DollarOutlined,
  UnorderedListOutlined,
  MoneyCollectOutlined,
  ExceptionOutlined,
  LinkOutlined,
  ControlOutlined,
  LockOutlined,
  TeamOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
  ProfileOutlined,
  FileProtectOutlined,
  ThunderboltOutlined,
  SyncOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;

const BasicLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
  const navigate = useNavigate();

  // 检测屏幕尺寸
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '仪表盘',
      onClick: () => navigate('/'),
    },
    {
      key: '/analytics',
      icon: <PieChartOutlined />,
      label: '数据分析',
      onClick: () => navigate('/analytics'),
    },
    {
      key: '/stats',
      icon: <LineChartOutlined />,
      label: '统计仪表板',
      onClick: () => navigate('/stats'),
    },
    {
      key: 'devices-menu',
      icon: <MobileOutlined />,
      label: '设备管理',
      children: [
        {
          key: '/devices',
          icon: <MobileOutlined />,
          label: '设备列表',
          onClick: () => navigate('/devices'),
        },
        {
          key: '/devices/lifecycle',
          icon: <ClockCircleOutlined />,
          label: '生命周期管理',
          onClick: () => navigate('/devices/lifecycle'),
        },
        {
          key: '/devices/failover',
          icon: <ThunderboltOutlined />,
          label: '故障转移',
          onClick: () => navigate('/devices/failover'),
        },
        {
          key: '/devices/state-recovery',
          icon: <SyncOutlined />,
          label: '状态恢复',
          onClick: () => navigate('/devices/state-recovery'),
        },
      ],
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: '用户管理',
      onClick: () => navigate('/users'),
    },
    {
      key: '/quotas',
      icon: <DashboardFilled />,
      label: '配额管理',
      onClick: () => navigate('/quotas'),
    },
    {
      key: '/apps',
      icon: <AppstoreOutlined />,
      label: '应用管理',
      onClick: () => navigate('/apps'),
    },
    {
      key: '/orders',
      icon: <ShoppingOutlined />,
      label: '订单管理',
      onClick: () => navigate('/orders'),
    },
    {
      key: '/plans',
      icon: <GoldOutlined />,
      label: '套餐管理',
      onClick: () => navigate('/plans'),
    },
    {
      key: 'billing',
      icon: <WalletOutlined />,
      label: '账单管理',
      children: [
        {
          key: '/billing/balance',
          icon: <AccountBookOutlined />,
          label: '余额概览',
          onClick: () => navigate('/billing/balance'),
        },
        {
          key: '/billing/transactions',
          icon: <TransactionOutlined />,
          label: '交易记录',
          onClick: () => navigate('/billing/transactions'),
        },
        {
          key: '/billing/invoices',
          icon: <FileTextOutlined />,
          label: '账单列表',
          onClick: () => navigate('/billing/invoices'),
        },
      ],
    },
    {
      key: '/tickets',
      icon: <CustomerServiceOutlined />,
      label: '工单系统',
      onClick: () => navigate('/tickets'),
    },
    {
      key: 'reports',
      icon: <BarChartOutlined />,
      label: '报表中心',
      children: [
        {
          key: '/reports/revenue',
          icon: <DollarOutlined />,
          label: '收入统计',
          onClick: () => navigate('/reports/revenue'),
        },
      ],
    },
    {
      key: '/usage',
      icon: <ClockCircleOutlined />,
      label: '使用记录',
      onClick: () => navigate('/usage'),
    },
    {
      key: 'payments',
      icon: <CreditCardOutlined />,
      label: '支付管理',
      children: [
        {
          key: '/payments/dashboard',
          icon: <PieChartOutlined />,
          label: '支付统计',
          onClick: () => navigate('/payments/dashboard'),
        },
        {
          key: '/payments',
          icon: <UnorderedListOutlined />,
          label: '支付列表',
          onClick: () => navigate('/payments'),
        },
        {
          key: '/payments/refunds',
          icon: <MoneyCollectOutlined />,
          label: '退款管理',
          onClick: () => navigate('/payments/refunds'),
        },
        {
          key: '/payments/exceptions',
          icon: <ExceptionOutlined />,
          label: '异常监控',
          onClick: () => navigate('/payments/exceptions'),
        },
        {
          key: '/payments/webhooks',
          icon: <LinkOutlined />,
          label: 'Webhook日志',
          onClick: () => navigate('/payments/webhooks'),
        },
        {
          key: '/payments/config',
          icon: <ControlOutlined />,
          label: '支付配置',
          onClick: () => navigate('/payments/config'),
        },
      ],
    },
    {
      key: 'system',
      icon: <SafetyOutlined />,
      label: '系统管理',
      children: [
        {
          key: '/settings',
          icon: <SettingOutlined />,
          label: '系统设置',
          onClick: () => navigate('/settings'),
        },
        {
          key: '/notifications/templates',
          icon: <BellOutlined />,
          label: '通知模板',
          onClick: () => navigate('/notifications/templates'),
        },
        {
          key: '/sms',
          icon: <MessageOutlined />,
          label: 'SMS 管理',
          onClick: () => navigate('/sms'),
        },
        {
          key: '/roles',
          icon: <TeamOutlined />,
          label: '角色管理',
          onClick: () => navigate('/roles'),
        },
        {
          key: 'permissions',
          icon: <LockOutlined />,
          label: '权限管理',
          children: [
            {
              key: '/permissions',
              icon: <SafetyCertificateOutlined />,
              label: '权限列表',
              onClick: () => navigate('/permissions'),
            },
            {
              key: '/permissions/data-scope',
              icon: <EyeOutlined />,
              label: '数据范围配置',
              onClick: () => navigate('/permissions/data-scope'),
            },
            {
              key: '/permissions/field-permission',
              icon: <FileProtectOutlined />,
              label: '字段权限配置',
              onClick: () => navigate('/permissions/field-permission'),
            },
          ],
        },
        {
          key: '/audit-logs',
          icon: <ProfileOutlined />,
          label: '审计日志',
          onClick: () => navigate('/audit-logs'),
        },
        {
          key: '/api-keys',
          icon: <ApiOutlined />,
          label: 'API 密钥',
          onClick: () => navigate('/api-keys'),
        },
      ],
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => {
        navigate('/profile');
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userId');
        navigate('/login');
      },
    },
  ];

  // 侧边栏内容
  const sidebarContent = (
    <>
      <div
        style={{
          height: 32,
          margin: 16,
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
        }}
      >
        {!collapsed ? '云手机平台' : '云'}
      </div>
      <Menu
        theme="dark"
        defaultSelectedKeys={['/']}
        mode="inline"
        items={menuItems}
        onClick={() => isMobile && setMobileDrawerVisible(false)}
      />
    </>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          breakpoint="lg"
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
          }}
        >
          {sidebarContent}
        </Sider>
      )}

      {/* 移动端抽屉侧边栏 */}
      {isMobile && (
        <Drawer
          placement="left"
          onClose={() => setMobileDrawerVisible(false)}
          open={mobileDrawerVisible}
          styles={{ body: { padding: 0, background: '#001529' } }}
          width={200}
        >
          {sidebarContent}
        </Drawer>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : collapsed ? 80 : 200 }}>
        <Header
          style={{
            padding: isMobile ? '0 16px' : '0 24px',
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 1,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          {isMobile && (
            <MenuOutlined
              style={{ fontSize: 20, cursor: 'pointer' }}
              onClick={() => setMobileDrawerVisible(true)}
            />
          )}
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <NotificationCenter />
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: isMobile ? '16px 8px' : '24px 16px',
            padding: isMobile ? 16 : 24,
            background: '#fff',
            minHeight: 'calc(100vh - 64px)',
            overflow: 'initial',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default BasicLayout;
