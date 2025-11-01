import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import type { QuickLink } from '@/utils/helpConfig';

const { Title, Text } = Typography;

interface QuickLinksGridProps {
  quickLinks: QuickLink[];
  onLinkClick: (path: string) => void;
}

/**
 * 帮助中心快速入口网格组件
 */
export const QuickLinksGrid: React.FC<QuickLinksGridProps> = React.memo(({
  quickLinks,
  onLinkClick,
}) => {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      {quickLinks.map((link, index) => (
        <Col key={index} xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => onLinkClick(link.path)}
            style={{ textAlign: 'center', cursor: 'pointer' }}
          >
            <div style={{ color: link.iconColor }}>
              {link.icon}
            </div>
            <Title level={4} style={{ marginTop: 16, marginBottom: 8 }}>
              {link.title}
            </Title>
            <Text type="secondary">{link.description}</Text>
          </Card>
        </Col>
      ))}
    </Row>
  );
});

QuickLinksGrid.displayName = 'QuickLinksGrid';
