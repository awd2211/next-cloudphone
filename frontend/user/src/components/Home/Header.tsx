import React from 'react';
import { Menu, Button, Space } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  AppstoreOutlined,
  DollarOutlined,
  QuestionCircleOutlined,
  InfoCircleOutlined,
  LoginOutlined,
  UserAddOutlined,
  DashboardOutlined,
} from '@ant-design/icons';

interface HeaderProps {
  isLoggedIn?: boolean;
  onLogin?: () => void;
  onRegister?: () => void;
  onDashboard?: () => void;
}

/**
 * 首页头部导航组件
 * 提供站点导航和登录/注册入口
 */
export const Header: React.FC<HeaderProps> = React.memo(({
  isLoggedIn = false,
  onLogin,
  onRegister,
  onDashboard,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/product',
      icon: <AppstoreOutlined />,
      label: '产品',
    },
    {
      key: '/pricing',
      icon: <DollarOutlined />,
      label: '价格',
    },
    {
      key: '/help',
      icon: <QuestionCircleOutlined />,
      label: '帮助',
    },
    {
      key: '/about',
      icon: <InfoCircleOutlined />,
      label: '关于',
    },
  ];

  const handleMenuClick = (e: { key: string }) => {
    navigate(e.key);
  };

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: '#fff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo 和站点名称 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/')}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <AppstoreOutlined style={{ fontSize: 24, color: 'white' }} />
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>云手机平台</h2>
        </div>

        {/* 导航菜单 */}
        <Menu
          mode="horizontal"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            flex: 1,
            border: 'none',
            justifyContent: 'center',
            minWidth: 0,
          }}
        />

        {/* 登录/注册按钮 */}
        <Space size="middle">
          {isLoggedIn && onDashboard ? (
            <Button
              type="primary"
              icon={<DashboardOutlined />}
              onClick={onDashboard}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
              }}
            >
              进入控制台
            </Button>
          ) : (
            <>
              {onLogin && (
                <Button
                  icon={<LoginOutlined />}
                  onClick={onLogin}
                >
                  登录
                </Button>
              )}
              {onRegister && (
                <Button
                  type="primary"
                  icon={<UserAddOutlined />}
                  onClick={onRegister}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                  }}
                >
                  注册
                </Button>
              )}
            </>
          )}
        </Space>
      </div>
    </div>
  );
});

Header.displayName = 'Header';
