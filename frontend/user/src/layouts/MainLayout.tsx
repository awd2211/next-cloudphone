import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Button, Space, Drawer, theme } from 'antd';
import {
  HomeOutlined,
  MobileOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  UserOutlined,
  LogoutOutlined,
  LoginOutlined,
  DollarOutlined,
  MenuOutlined,
  CustomerServiceOutlined,
  MessageOutlined,
  QuestionCircleOutlined,
  ExportOutlined,
  AccountBookOutlined,
  GiftOutlined,
  TeamOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import NotificationCenter from '@/components/NotificationCenter';
import LiveChatWidget from '@/components/LiveChatWidget';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { useTheme } from '@/hooks/useTheme';

const { useToken } = theme;

const { Header, Content, Footer } = Layout;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [user] = useState(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  });

  // 获取主题状态和 Ant Design token
  const { mode, actualTheme, setMode, toggleTheme, isDark } = useTheme();
  const { token } = useToken();

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
    {
      key: '/tickets',
      icon: <CustomerServiceOutlined />,
      label: '我的工单',
      onClick: () => navigate('/tickets'),
    },
    {
      key: 'messages-menu',
      icon: <MessageOutlined />,
      label: '消息中心',
      children: [
        {
          key: '/messages',
          label: '消息列表',
          onClick: () => navigate('/messages'),
        },
        {
          key: '/messages/sms',
          label: 'SMS验证码',
          onClick: () => navigate('/messages/sms'),
        },
      ],
    },
    {
      key: '/proxy',
      icon: <GlobalOutlined />,
      label: '我的代理',
      onClick: () => navigate('/proxy'),
    },
    {
      key: '/activities',
      icon: <GiftOutlined />,
      label: '活动中心',
      onClick: () => navigate('/activities'),
    },
    {
      key: '/referral',
      icon: <TeamOutlined />,
      label: '邀请返利',
      onClick: () => navigate('/referral'),
    },
    {
      key: '/help',
      icon: <QuestionCircleOutlined />,
      label: '帮助中心',
      onClick: () => navigate('/help'),
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
      key: 'billing',
      icon: <AccountBookOutlined />,
      label: '账单管理',
      onClick: () => navigate('/billing'),
    },
    {
      key: 'export',
      icon: <ExportOutlined />,
      label: '数据导出',
      onClick: () => navigate('/export'),
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
          background: token.colorBgContainer,
          boxShadow: isDark
            ? '0 2px 8px rgba(0, 0, 0, 0.45)'
            : '0 2px 8px rgba(0, 0, 0, 0.06)',
          padding: isMobile ? '0 16px' : '0 50px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            fontSize: isMobile ? 18 : 20,
            marginRight: isMobile ? 16 : 48,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            color: token.colorText,
          }}
          onClick={() => navigate('/')}
        >
          {isMobile ? '云手机' : '云手机平台'}
        </div>

        {/* 桌面端菜单 */}
        {!isMobile && (
          <Menu
            theme={isDark ? 'dark' : 'light'}
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              background: 'transparent',
            }}
          />
        )}

        {/* 移动端菜单按钮 */}
        {isMobile && <div style={{ flex: 1 }} />}

        <Space size={isMobile ? 'middle' : 'large'}>
          {/* 主题切换按钮 */}
          <ThemeSwitch
            mode={mode}
            actualTheme={actualTheme}
            onModeChange={setMode}
            onToggle={toggleTheme}
            variant={isMobile ? 'icon-only' : 'dropdown'}
            size={isMobile ? 'small' : 'middle'}
          />

          {user ? (
            <>
              {!isMobile && <NotificationCenter />}
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <Avatar icon={<UserOutlined />} style={{ marginRight: isMobile ? 0 : 8 }} />
                  {!isMobile && (
                    <span style={{ color: token.colorText }}>
                      {user.username}
                    </span>
                  )}
                </div>
              </Dropdown>
            </>
          ) : (
            <Button
              type="primary"
              icon={<LoginOutlined />}
              onClick={() => navigate('/login')}
              size={isMobile ? 'small' : 'middle'}
            >
              {isMobile ? '登录' : '登录/注册'}
            </Button>
          )}

          {isMobile && (
            <MenuOutlined
              style={{ fontSize: 20, cursor: 'pointer', color: token.colorText }}
              onClick={() => setDrawerVisible(true)}
            />
          )}
        </Space>
      </Header>

      {/* 移动端抽屉菜单 */}
      {isMobile && (
        <Drawer
          title="菜单"
          placement="right"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
        >
          <Menu
            mode="vertical"
            selectedKeys={[location.pathname]}
            items={menuItems}
            onClick={() => setDrawerVisible(false)}
          />
        </Drawer>
      )}

      <Content style={{ padding: isMobile ? '16px' : '24px 50px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          <Outlet />
        </div>
      </Content>

      <Footer
        style={{
          textAlign: 'center',
          background: isDark ? token.colorBgElevated : '#f0f2f5',
          padding: isMobile ? '12px' : '24px 50px',
          color: token.colorTextSecondary,
          borderTop: `1px solid ${token.colorBorderSecondary}`,
          transition: 'background-color 0.3s ease, color 0.3s ease',
        }}
      >
        云手机平台 ©{new Date().getFullYear()}
      </Footer>

      {/* 在线客服浮动按钮 */}
      {user && <LiveChatWidget />}
    </Layout>
  );
};

export default MainLayout;
