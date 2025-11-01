import React from 'react';
import { Card, Typography, QRCode, Button, Space } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { ReferralConfig } from '@/services/referral';

const { Title, Paragraph } = Typography;

interface QRCodeTabProps {
  config: ReferralConfig | null;
  onDownloadQRCode: () => void;
}

/**
 * 二维码 Tab 内容组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 清晰的二维码展示区域
 */
export const QRCodeTab: React.FC<QRCodeTabProps> = React.memo(({ config, onDownloadQRCode }) => {
  return (
    <Card>
      <Title level={4}>邀请二维码</Title>
      <Paragraph>好友扫码即可快速注册</Paragraph>

      {/* 二维码显示区域 */}
      <div
        id="qr-code"
        style={{
          textAlign: 'center',
          padding: '32px',
          background: '#f5f5f5',
          borderRadius: 8,
          marginBottom: 16,
        }}
      >
        {config?.inviteLink && (
          <QRCode value={config.inviteLink} size={240} icon="/logo.png" errorLevel="H" />
        )}
      </div>

      {/* 下载按钮 */}
      <Space style={{ width: '100%' }}>
        <Button
          type="primary"
          size="large"
          icon={<DownloadOutlined />}
          onClick={onDownloadQRCode}
          block
        >
          下载二维码
        </Button>
      </Space>
    </Card>
  );
});

QRCodeTab.displayName = 'QRCodeTab';
