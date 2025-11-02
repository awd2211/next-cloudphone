import React from 'react';
import { Card, Descriptions, Space } from 'antd';
import { UserOutlined, MailOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { User } from './constants';

interface ProfileBasicInfoProps {
  user: User;
  loading: boolean;
}

export const ProfileBasicInfo: React.FC<ProfileBasicInfoProps> = React.memo(
  ({ user, loading }) => {
    return (
      <Card title="基本信息" loading={loading} style={{ marginBottom: 24 }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="用户名" span={1}>
            <Space>
              <UserOutlined />
              {user.username}
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label="邮箱" span={1}>
            <Space>
              <MailOutlined />
              {user.email}
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label="角色" span={1}>
            {user.role || '管理员'}
          </Descriptions.Item>

          <Descriptions.Item label="注册时间" span={1}>
            {user.createdAt ? dayjs(user.createdAt).format('YYYY-MM-DD HH:mm') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    );
  }
);

ProfileBasicInfo.displayName = 'ProfileBasicInfo';
