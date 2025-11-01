import React from 'react';
import { Card, Space, Button, Typography } from 'antd';
import { CustomerServiceOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface HelpFooterProps {
  onContactClick: () => void;
  onFAQClick: () => void;
}

/**
 * 帮助中心底部提示组件
 */
export const HelpFooter: React.FC<HelpFooterProps> = React.memo(({
  onContactClick,
  onFAQClick,
}) => {
  return (
    <Card style={{ textAlign: 'center', background: '#fafafa' }}>
      <Space direction="vertical" size="middle">
        <CustomerServiceOutlined style={{ fontSize: 48, color: '#1890ff' }} />
        <div>
          <Title level={4} style={{ marginBottom: 8 }}>
            找不到您需要的帮助？
          </Title>
          <Paragraph type="secondary">我们的客服团队随时准备为您提供帮助</Paragraph>
        </div>
        <Space>
          <Button type="primary" size="large" onClick={onContactClick}>
            提交工单
          </Button>
          <Button size="large" onClick={onFAQClick}>
            查看 FAQ
          </Button>
        </Space>
      </Space>
    </Card>
  );
});

HelpFooter.displayName = 'HelpFooter';
