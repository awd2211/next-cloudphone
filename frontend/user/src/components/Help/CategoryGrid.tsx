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
 * 帮助分类网格组件（优化版）
 */
export const CategoryGrid: React.FC<CategoryGridProps> = React.memo(({
  categories,
  onCategoryClick,
}) => {
  if (categories.length === 0) return null;

  return (
    <div style={{ marginBottom: 48 }}>
      <style>
        {`
          @keyframes categorySlideIn {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes categoryIconRotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes arrowSlide {
            0%, 100% { transform: translateX(0); }
            50% { transform: translateX(4px); }
          }
          .category-card {
            position: relative;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            border: 1px solid #f0f0f0;
            background: #fff;
          }
          .category-card:hover {
            transform: translateY(-4px) translateX(4px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08) !important;
            border-color: transparent;
          }
          .category-card:hover .category-icon {
            animation: categoryIconRotate 0.6s ease-in-out;
          }
          .category-card:hover .category-arrow {
            animation: arrowSlide 0.6s ease-in-out infinite;
          }
          .category-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
            transition: left 0.5s;
          }
          .category-card:hover::before {
            left: 100%;
          }
        `}
      </style>

      {/* 标题区域 */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 4, height: 28, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 2, marginRight: 12 }} />
        <Typography.Title level={3} style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
          浏览分类
        </Typography.Title>
      </div>

      <Row gutter={[20, 20]}>
        {categories.map((category, index) => {
          const icon = categoryIcons[category.icon] || <BookOutlined />;
          const color = categoryColors[category.icon] || '#1890ff';

          return (
            <Col key={category.id} xs={24} sm={12} lg={8}>
              <Card
                className="category-card"
                bodyStyle={{ padding: 20 }}
                onClick={() => onCategoryClick(category.id)}
                style={{
                  animation: `categorySlideIn 0.5s ease-out ${index * 0.1}s backwards`,
                }}
              >
                <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                  <Space align="start" size={16}>
                    <div
                      className="category-icon"
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: '12px',
                        background: `linear-gradient(135deg, ${color}15, ${color}25)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28,
                        color,
                        flexShrink: 0,
                        boxShadow: `0 4px 12px ${color}20`,
                      }}
                    >
                      {icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 16, color: '#1e293b' }}>
                        {category.name}
                      </div>
                      <Space size={8} style={{ flexWrap: 'wrap' }}>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          {category.articleCount} 篇文章
                        </Text>
                        <span style={{ color: '#d1d5db' }}>•</span>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          立即查看
                        </Text>
                      </Space>
                    </div>
                  </Space>
                  <RightOutlined
                    className="category-arrow"
                    style={{
                      color: color,
                      fontSize: 14,
                      marginTop: 4,
                    }}
                  />
                </Space>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
});

CategoryGrid.displayName = 'CategoryGrid';
