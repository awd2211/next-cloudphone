import React from 'react';
import { Result, Button, Spin } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = React.memo(
  ({ permission, children }) => {
    const navigate = useNavigate();
    const { hasPermission, loading: permissionLoading } = usePermission();

    if (permissionLoading) {
      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <Spin size="large" tip="正在加载权限..." />
        </div>
      );
    }

    if (!hasPermission(permission)) {
      return (
        <div style={{ padding: '24px' }}>
          <Result
            status="403"
            title="403"
            subTitle="抱歉，您没有权限访问此页面。"
            icon={<LockOutlined />}
            extra={
              <Button type="primary" onClick={() => navigate('/')}>
                返回首页
              </Button>
            }
          />
        </div>
      );
    }

    return <>{children}</>;
  }
);

PermissionGuard.displayName = 'PermissionGuard';
