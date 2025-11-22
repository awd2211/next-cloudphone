import React, { useMemo } from 'react';
import { Card, Row, Col, Typography } from 'antd';
import {
  FileTextOutlined,
  QuestionCircleOutlined,
  VideoCameraOutlined,
  CustomerServiceOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface QuickLinkConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}

interface HelpQuickLinksProps {
  onNavigate: (path: string) => void;
}

/**
 * 帮助中心快速链接组件
 * 4 个快速入口卡片
 */
export const HelpQuickLinks: React.FC<HelpQuickLinksProps> = React.memo(({
  onNavigate,
}) => {
  const quickLinks: QuickLinkConfig[] = useMemo(
    () => [
      {
        icon: <FileTextOutlined style={{ fontSize: 32 }} />,
        title: '帮助文档',
        description: '详细的产品使用指南',
        color: '#1890ff',
        onClick: () => onNavigate('/help/docs'),
      },
      {
        icon: <QuestionCircleOutlined style={{ fontSize: 32 }} />,
        title: '常见问题',
        description: '快速找到问题答案',
        color: '#52c41a',
        onClick: () => onNavigate('/help/faq'),
      },
      {
        icon: <VideoCameraOutlined style={{ fontSize: 32 }} />,
        title: '视频教程',
        description: '观看操作演示视频',
        color: '#faad14',
        onClick: () => onNavigate('/help/tutorials'),
      },
      {
        icon: <CustomerServiceOutlined style={{ fontSize: 32 }} />,
        title: '联系客服',
        description: '7x24 小时在线支持',
        color: '#f5222d',
        onClick: () => onNavigate('/support/ticket/create'),
      },
    ],
    [onNavigate]
  );

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {quickLinks.map((link, index) => (
        <Col xs={24} sm={12} lg={6} key={index}>
          <Card
            hoverable
            onClick={link.onClick}
            style={{
              textAlign: 'center',
              height: '100%',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
            styles={{ body: { padding: '32px 16px' } }}
          >
            <div style={{ color: link.color, marginBottom: 12 }}>
              {link.icon}
            </div>
            <Title level={5} style={{ marginBottom: 8 }}>
              {link.title}
            </Title>
            <Text type="secondary">{link.description}</Text>
          </Card>
        </Col>
      ))}
    </Row>
  );
});

HelpQuickLinks.displayName = 'HelpQuickLinks';
