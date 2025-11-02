import React from 'react';
import { Card, Descriptions, Button, Space } from 'antd';
import { EditOutlined, GlobalOutlined, BgColorsOutlined } from '@ant-design/icons';
import { getLanguageName, getThemeName, type User } from './constants';

interface ProfilePreferencesCardProps {
  user: User;
  onEdit: () => void;
}

export const ProfilePreferencesCard: React.FC<ProfilePreferencesCardProps> = React.memo(
  ({ user, onEdit }) => {
    return (
      <Card title="偏好设置" style={{ marginBottom: 24 }}>
        <Descriptions column={2} bordered>
          <Descriptions.Item label="语言" span={1}>
            <Space>
              <GlobalOutlined />
              {getLanguageName(user.language)}
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label="主题" span={1}>
            <Space>
              <BgColorsOutlined />
              {getThemeName(user.theme)}
            </Space>
          </Descriptions.Item>
        </Descriptions>

        <Button
          icon={<EditOutlined />}
          onClick={onEdit}
          style={{ marginTop: 16 }}
        >
          修改偏好设置
        </Button>
      </Card>
    );
  }
);

ProfilePreferencesCard.displayName = 'ProfilePreferencesCard';
