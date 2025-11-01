import React from 'react';
import { Card, Typography, Button, Space } from 'antd';
import { GiftOutlined, DownloadOutlined } from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;

interface PosterTabProps {
  posterUrl: string;
  onGeneratePoster: () => void;
}

/**
 * 邀请海报 Tab 内容组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 条件渲染海报内容或占位符
 */
export const PosterTab: React.FC<PosterTabProps> = React.memo(
  ({ posterUrl, onGeneratePoster }) => {
    return (
      <Card>
        <Title level={4}>邀请海报</Title>
        <Paragraph>生成精美的邀请海报，分享给好友更有吸引力</Paragraph>

        {/* 海报显示区域 */}
        {posterUrl ? (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <img
              src={posterUrl}
              alt="邀请海报"
              style={{ maxWidth: '100%', maxHeight: 600, borderRadius: 8 }}
            />
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 0',
              background: '#f5f5f5',
              borderRadius: 8,
              marginBottom: 16,
            }}
          >
            <Text type="secondary">点击下方按钮生成邀请海报</Text>
          </div>
        )}

        {/* 操作按钮 */}
        <Space style={{ width: '100%' }}>
          <Button
            type="primary"
            size="large"
            icon={<GiftOutlined />}
            onClick={onGeneratePoster}
            block
          >
            生成海报
          </Button>
          {posterUrl && (
            <Button
              size="large"
              icon={<DownloadOutlined />}
              onClick={() => window.open(posterUrl)}
              block
            >
              下载海报
            </Button>
          )}
        </Space>
      </Card>
    );
  }
);

PosterTab.displayName = 'PosterTab';
