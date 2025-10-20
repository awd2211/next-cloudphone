import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Drawer } from 'antd';
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
      key: '/devices',
      icon: <MobileOutlined />,
      label: '设备管理',
      onClick: () => navigate('/devices'),
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: '用户管理',
      onClick: () => navigate('/users'),
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
      key: 'reports',
      icon: <BarChartOutlined />,
      label: '报表中心',
      children: [
        {
          key: '/reports/revenue',
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
      key: '/payments',
      icon: <CreditCardOutlined />,
      label: '支付管理',
      onClick: () => navigate('/payments'),
    },
    {
      key: 'system',
      icon: <SafetyOutlined />,
      label: '系统管理',
      children: [
        {
          key: '/roles',
          icon: <KeyOutlined />,
          label: '角色管理',
          onClick: () => navigate('/roles'),
        },
        {
          key: '/permissions',
          label: '权限管理',
          onClick: () => navigate('/permissions'),
        },
      ],
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        localStorage.removeItem('token');
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
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Avatar icon={<UserOutlined />} style={{ cursor: 'pointer' }} />
          </Dropdown>
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
