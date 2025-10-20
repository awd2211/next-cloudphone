import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Button } from 'antd';
import {
  HomeOutlined,
  MobileOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  UserOutlined,
  LogoutOutlined,
  LoginOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';

const { Header, Content, Footer } = Layout;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user] = useState(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  });

  const menuItems: MenuProps['items'] = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
      onClick: () => navigate('/'),
    },
    {
      key: '/devices',
      icon: <MobileOutlined />,
      label: '我的设备',
      onClick: () => navigate('/devices'),
    },
    {
      key: '/apps',
      icon: <AppstoreOutlined />,
      label: '应用市场',
      onClick: () => navigate('/apps'),
    },
    {
      key: '/orders',
      icon: <ShoppingOutlined />,
      label: '我的订单',
      onClick: () => navigate('/orders'),
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'recharge',
      icon: <DollarOutlined />,
      label: '账户充值',
      onClick: () => navigate('/recharge'),
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
        navigate('/login');
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            fontSize: 20,
            marginRight: 48,
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          云手机平台
        </div>

        <Menu
          theme="light"
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ flex: 1, minWidth: 0, border: 'none' }}
        />

        {user ? (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
              <span>{user.username}</span>
            </div>
          </Dropdown>
        ) : (
          <Button
            type="primary"
            icon={<LoginOutlined />}
            onClick={() => navigate('/login')}
          >
            登录/注册
          </Button>
        )}
      </Header>

      <Content style={{ padding: '24px 50px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <Outlet />
        </div>
      </Content>

      <Footer style={{ textAlign: 'center', background: '#f0f2f5' }}>
        云手机平台 ©{new Date().getFullYear()} Created by Your Company
      </Footer>
    </Layout>
  );
};

export default MainLayout;
