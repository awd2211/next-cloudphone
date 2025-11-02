import React from 'react';
import { Card, Space, Button } from 'antd';
import { LockOutlined } from '@ant-design/icons';

interface ProfileSecurityCardProps {
  onChangePassword: () => void;
}

export const ProfileSecurityCard: React.FC<ProfileSecurityCardProps> = React.memo(
  ({ onChangePassword }) => {
    return (
      <Card title="安全设置">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <h4>修改密码</h4>
            <Button icon={<LockOutlined />} onClick={onChangePassword}>
              修改密码
            </Button>
          </div>
        </Space>
      </Card>
    );
  }
);

ProfileSecurityCard.displayName = 'ProfileSecurityCard';
