import React from 'react';
import { Card, Typography, Input, Button, Space, Divider } from 'antd';
import {
  CopyOutlined,
  WechatOutlined,
  QqOutlined,
  WeiboOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import type { ReferralConfig } from '@/services/referral';

const { Title, Paragraph } = Typography;

interface InviteLinkTabProps {
  config: ReferralConfig | null;
  onCopyLink: () => void;
  onShare: (platform: 'wechat' | 'qq' | 'weibo' | 'link') => void;
}

/**
 * 邀请链接 Tab 内容组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 社交分享按钮统一管理
 */
export const InviteLinkTab: React.FC<InviteLinkTabProps> = React.memo(
  ({ config, onCopyLink, onShare }) => {
    return (
      <Card>
        <Title level={4}>我的邀请链接</Title>
        <Paragraph>复制链接发送给好友，好友点击链接即可注册</Paragraph>

        {/* 链接显示区域 */}
        <Input.TextArea
          value={config?.inviteLink || ''}
          readOnly
          rows={3}
          style={{ marginBottom: 16 }}
        />

        {/* 复制链接按钮 */}
        <Space style={{ width: '100%' }}>
          <Button type="primary" size="large" icon={<CopyOutlined />} onClick={onCopyLink} block>
            复制链接
          </Button>
        </Space>

        <Divider />

        {/* 社交分享按钮 */}
        <Title level={5}>分享到社交平台</Title>
        <Space wrap>
          <Button
            icon={<WechatOutlined />}
            onClick={() => onShare('wechat')}
            style={{ color: '#07c160' }}
          >
            微信
          </Button>
          <Button
            icon={<QqOutlined />}
            onClick={() => onShare('qq')}
            style={{ color: '#12b7f5' }}
          >
            QQ
          </Button>
          <Button
            icon={<WeiboOutlined />}
            onClick={() => onShare('weibo')}
            style={{ color: '#ff8200' }}
          >
            微博
          </Button>
          <Button icon={<ShareAltOutlined />} onClick={() => onShare('link')}>
            更多...
          </Button>
        </Space>
      </Card>
    );
  }
);

InviteLinkTab.displayName = 'InviteLinkTab';
