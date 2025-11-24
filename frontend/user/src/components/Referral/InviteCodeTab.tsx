import React from 'react';
import { Card, Typography, Button, Space, theme } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import type { ReferralConfig } from '@/services/referral';

const { Title, Paragraph } = Typography;
const { useToken } = theme;

interface InviteCodeTabProps {
  config: ReferralConfig | null;
  onCopyCode: () => void;
}

/**
 * 邀请码 Tab 内容组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 清晰的视觉层次设计
 */
export const InviteCodeTab: React.FC<InviteCodeTabProps> = React.memo(({ config, onCopyCode }) => {
  const { token } = useToken();

  return (
    <Card>
      <Title level={4}>我的邀请码</Title>
      <Paragraph>分享您的专属邀请码给好友，好友注册时填写即可</Paragraph>

      {/* 邀请码显示区域 */}
      <div
        style={{
          background: token.colorBgLayout,
          padding: '24px',
          borderRadius: 8,
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 'bold',
            color: token.colorPrimary,
            letterSpacing: 4,
          }}
        >
          {config?.inviteCode || '----'}
        </div>
      </div>

      {/* 复制按钮 */}
      <Space style={{ width: '100%' }} direction="vertical">
        <Button type="primary" size="large" block icon={<CopyOutlined />} onClick={onCopyCode}>
          复制邀请码
        </Button>
      </Space>
    </Card>
  );
});

InviteCodeTab.displayName = 'InviteCodeTab';
