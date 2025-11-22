import React from 'react';
import { Card, Row, Col, Typography, Badge } from 'antd';
import * as Icons from '@ant-design/icons';

const { Title, Text } = Typography;

interface HelpCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  articleCount: number;
}

interface HelpCategoryGridProps {
  categories: HelpCategory[];
  onCategoryClick: (categoryId: string) => void;
}

/**
 * 帮助分类网格组件
 * 支持图标和颜色配置
 */
export const HelpCategoryGrid: React.FC<HelpCategoryGridProps> = React.memo(({
  categories,
  onCategoryClick,
}) => {
  const getIcon = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent style={{ fontSize: 24 }} /> : null;
  };

  return (
    <Card title={<Title level={4}>帮助分类</Title>} style={{ marginBottom: 24 }}>
      <Row gutter={[16, 16]}>
        {categories.map((category) => (
          <Col xs={24} sm={12} md={8} lg={6} key={category.id}>
            <Card
              hoverable
              onClick={() => onCategoryClick(category.id)}
              style={{
                textAlign: 'center',
                borderColor: category.color,
                cursor: 'pointer',
              }}
              styles={{ body: { padding: '24px 16px' } }}
            >
              <div style={{ color: category.color, marginBottom: 12 }}>
                {getIcon(category.icon)}
              </div>
              <Title level={5} style={{ marginBottom: 4 }}>
                {category.name}
              </Title>
              <Badge
                count={category.articleCount}
                style={{
                  backgroundColor: category.color,
                }}
                showZero
              />
              <Text type="secondary" style={{ marginLeft: 8 }}>
                篇文章
              </Text>
            </Card>
          </Col>
        ))}
      </Row>
    </Card>
  );
});

HelpCategoryGrid.displayName = 'HelpCategoryGrid';
