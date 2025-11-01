import React from 'react';
import { Card, Row, Col, Space, Typography } from 'antd';
import { RightOutlined, BookOutlined } from '@ant-design/icons';
import type { HelpCategory } from '@/services/help';
import { categoryIcons, categoryColors } from '@/utils/helpConfig';

const { Text } = Typography;

interface CategoryGridProps {
  categories: HelpCategory[];
  onCategoryClick: (categoryId: string) => void;
}

/**
 * 帮助分类网格组件
 */
export const CategoryGrid: React.FC<CategoryGridProps> = React.memo(({
  categories,
  onCategoryClick,
}) => {
  if (categories.length === 0) return null;

  return (
    <Card title="浏览分类" style={{ marginBottom: 24 }}>
      <Row gutter={[16, 16]}>
        {categories.map((category) => {
          const icon = categoryIcons[category.icon] || <BookOutlined />;
          const color = categoryColors[category.icon] || '#1890ff';

          return (
            <Col key={category.id} xs={24} sm={12} lg={8}>
              <Card
                size="small"
                hoverable
                onClick={() => onCategoryClick(category.id)}
                style={{ cursor: 'pointer' }}
              >
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '8px',
                        background: `${color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        color,
                      }}
                    >
                      {icon}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{category.name}</div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {category.articleCount} 篇文章
                      </Text>
                    </div>
                  </Space>
                  <RightOutlined style={{ color: '#999' }} />
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
});

CategoryGrid.displayName = 'CategoryGrid';
