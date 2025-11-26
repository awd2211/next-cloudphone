/**
 * 主布局组件
 *
 * 包含:
 * 1. 侧边栏导航菜单
 * 2. 顶部工具栏 (通知中心、用户菜单)
 * 3. 内容区域
 * 4. 响应式设计
 */

import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Button,
  Space,
  theme,
  Tooltip,
  Tag,
} from 'antd';
import {
  MobileOutlined,
  GlobalOutlined,
  MessageOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
  QuestionCircleOutlined,
  ExpandOutlined,
  ControlOutlined,
  SunOutlined,
  MoonOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { NotificationCenter } from '@/components/NotificationCenter';
import { NotificationToast } from '@/components/NotificationToast';
import { useTheme, type ThemeMode } from '@/contexts/ThemeContext';

const { Header, Content, Sider } = Layout;
const { useToken } = theme;

const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useToken();
  const { mode, setMode, isDark } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [user] = useState(() => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  });

  // 主题切换下拉菜单
  const themeMenuItems: MenuProps['items'] = [
    {
      key: 'light',
      icon: <SunOutlined />,
      label: '浅色模式',
      onClick: () => setMode('light'),
    },
    {
      key: 'dark',
      icon: <MoonOutlined />,
      label: '深色模式',
      onClick: () => setMode('dark'),
    },
    {
      key: 'system',
      icon: <DesktopOutlined />,
      label: '跟随系统',
      onClick: () => setMode('system'),
    },
  ];

  // 获取当前主题图标
  const getThemeIcon = () => {
    switch (mode) {
      case 'dark':
        return <MoonOutlined style={{ fontSize: 16 }} />;
      case 'system':
        return <DesktopOutlined style={{ fontSize: 16 }} />;
      default:
        return <SunOutlined style={{ fontSize: 16 }} />;
    }
  };

  // 响应式侧边栏
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 992) {
        setCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 切换全屏
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const menuItems: MenuProps['items'] = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '工作台',
      onClick: () => navigate('/dashboard'),
    },
    {
      key: '/devices',
      icon: <MobileOutlined />,
      label: '设备管理',
      onClick: () => navigate('/devices'),
    },
    {
      key: '/control',
      icon: <ControlOutlined />,
      label: '群控中心',
      onClick: () => navigate('/control'),
    },
    {
      key: '/proxy',
      icon: <GlobalOutlined />,
      label: '代理管理',
      onClick: () => navigate('/proxy'),
    },
    {
      key: '/sms',
      icon: <MessageOutlined />,
      label: '验证码接收',
      onClick: () => navigate('/sms'),
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      onClick: () => navigate('/settings'),
    },
  ];

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人信息',
      onClick: () => navigate('/profile'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
      },
    },
  ];

  // 获取当前选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/devices')) return '/devices';
    if (path.startsWith('/control')) return '/control';
    if (path.startsWith('/proxy')) return '/proxy';
    if (path.startsWith('/sms')) return '/sms';
    if (path.startsWith('/settings')) return '/settings';
    return '/dashboard';
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 实时通知 Toast */}
      <NotificationToast />

      {/* 侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: 'linear-gradient(180deg, #001529 0%, #002140 100%)',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.15)',
        }}
        width={220}
      >
        {/* Logo区域 */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            cursor: 'pointer',
            background: 'rgba(0, 0, 0, 0.2)',
          }}
          onClick={() => navigate('/dashboard')}
        >
          {collapsed ? (
            <SafetyCertificateOutlined
              style={{ fontSize: 28, color: '#1677ff' }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <SafetyCertificateOutlined
                style={{ fontSize: 28, color: '#1677ff' }}
              />
              <div
                style={{
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: 1,
                  lineHeight: 1.3,
                }}
              >
                <div>境外移动集群</div>
                <div style={{ color: '#c41d1d', fontSize: 13 }}>察打一体平台</div>
              </div>
            </div>
          )}
        </div>

        {/* 菜单 */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          style={{
            borderRight: 0,
            marginTop: 8,
            background: 'transparent',
          }}
        />

        {/* 底部状态 */}
        {!collapsed && (
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '16px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(0, 0, 0, 0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#52c41a',
                  boxShadow: '0 0 8px rgba(82, 196, 26, 0.6)',
                  animation: 'pulse 2s infinite',
                }}
              />
              <span
                style={{
                  color: 'rgba(255, 255, 255, 0.65)',
                  fontSize: 12,
                }}
              >
                系统运行正常
              </span>
            </div>
          </div>
        )}
      </Sider>

      {/* 主内容区 */}
      <Layout
        style={{
          marginLeft: collapsed ? 80 : 220,
          transition: 'margin-left 0.2s',
        }}
      >
        {/* 头部 */}
        <Header
          style={{
            padding: '0 24px',
            background: isDark ? '#1f1f1f' : '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: isDark
              ? '0 1px 4px rgba(0, 0, 0, 0.3)'
              : '0 1px 4px rgba(0, 0, 0, 0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            transition: 'background 0.3s, box-shadow 0.3s',
          }}
        >
          <Space>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: 16, width: 48, height: 48 }}
            />
            {/* 面包屑可以放这里 */}
          </Space>

          <Space size="middle">
            {/* 帮助按钮 */}
            <Tooltip title="帮助文档">
              <Button
                type="text"
                icon={<QuestionCircleOutlined style={{ fontSize: 16 }} />}
              />
            </Tooltip>

            {/* 主题切换 */}
            <Dropdown
              menu={{
                items: themeMenuItems,
                selectedKeys: [mode],
              }}
              placement="bottomRight"
            >
              <Tooltip title="切换主题">
                <Button type="text" icon={getThemeIcon()} />
              </Tooltip>
            </Dropdown>

            {/* 全屏按钮 */}
            <Tooltip title={isFullscreen ? '退出全屏' : '全屏'}>
              <Button
                type="text"
                icon={<ExpandOutlined style={{ fontSize: 16 }} />}
                onClick={toggleFullscreen}
              />
            </Tooltip>

            {/* 通知中心 */}
            <NotificationCenter />

            {/* 用户菜单 */}
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 8px',
                  borderRadius: 6,
                  transition: 'background 0.2s',
                }}
                className="user-dropdown-trigger"
              >
                <Avatar
                  style={{
                    backgroundColor: token.colorPrimary,
                  }}
                  icon={<UserOutlined />}
                  size={32}
                />
                <div style={{ marginLeft: 8, lineHeight: 1.3 }}>
                  <div
                    style={{
                      color: token.colorText,
                      fontSize: 13,
                      fontWeight: 500,
                    }}
                  >
                    {user?.username || '管理员'}
                  </div>
                  <Tag
                    color="processing"
                    style={{
                      fontSize: 10,
                      padding: '0 4px',
                      lineHeight: '16px',
                      margin: 0,
                    }}
                  >
                    超级管理员
                  </Tag>
                </div>
              </div>
            </Dropdown>
          </Space>
        </Header>

        {/* 内容区 */}
        <Content
          style={{
            margin: 24,
            minHeight: 'calc(100vh - 64px - 48px)',
          }}
        >
          <Outlet />
        </Content>
      </Layout>

      {/* 样式 */}
      <style>{`
        .user-dropdown-trigger:hover {
          background: rgba(0, 0, 0, 0.04);
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* 通知铃铛动画 */
        .notification-bell-active .anticon-bell {
          animation: bellRing 0.5s ease-in-out;
        }

        @keyframes bellRing {
          0%, 100% { transform: rotate(0); }
          25% { transform: rotate(15deg); }
          50% { transform: rotate(-15deg); }
          75% { transform: rotate(10deg); }
        }
      `}</style>
    </Layout>
  );
};

export default MainLayout;
