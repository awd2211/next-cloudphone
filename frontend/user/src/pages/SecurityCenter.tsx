import React from 'react';
import { Tabs, Card, message, theme } from 'antd';
import {
  LockOutlined,
  SafetyOutlined,
  HistoryOutlined,
  UserOutlined,
} from '@ant-design/icons';

const { useToken } = theme;
import { PasswordManagement } from '@/components/Security/PasswordManagement';
import { TwoFactorManagement } from '@/components/Security/TwoFactorManagement';
import { LoginHistory } from '@/components/Security/LoginHistory';
import { SessionManagement } from '@/components/Security/SessionManagement';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * 安全中心页面
 *
 * 功能模块：
 * 1. 密码管理 - 修改密码
 * 2. 双因素认证 - 启用/禁用 2FA
 * 3. 登录历史 - 查看登录记录
 * 4. 会话管理 - 管理活跃会话
 */
const SecurityCenter: React.FC = () => {
  const { token } = useToken();

  // 快捷键支持：Ctrl+R 刷新页面
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        window.location.reload();
        message.success('页面已刷新');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const tabItems = [
    {
      key: 'password',
      label: (
        <span>
          <LockOutlined />
          密码管理
        </span>
      ),
      children: <PasswordManagement />,
    },
    {
      key: '2fa',
      label: (
        <span>
          <SafetyOutlined />
          双因素认证
        </span>
      ),
      children: <TwoFactorManagement />,
    },
    {
      key: 'history',
      label: (
        <span>
          <HistoryOutlined />
          登录历史
        </span>
      ),
      children: <LoginHistory />,
    },
    {
      key: 'sessions',
      label: (
        <span>
          <UserOutlined />
          会话管理
        </span>
      ),
      children: <SessionManagement />,
    },
  ];

  return (
    <ErrorBoundary>
      <div style={{ padding: '24px' }}>
        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SafetyOutlined style={{ fontSize: '24px', color: token.colorPrimary }} />
              <span style={{ fontSize: '20px', fontWeight: 600 }}>安全中心</span>
            </div>
          }
          bordered={false}
        >
          <Tabs
            defaultActiveKey="password"
            items={tabItems}
            size="large"
            style={{ minHeight: '500px' }}
          />
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default SecurityCenter;
