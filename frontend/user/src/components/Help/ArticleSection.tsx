import React from 'react';
import { Card, Row, Col, List, Space, Tag, Button, Empty, Typography, theme } from 'antd';
import { FireOutlined, ClockCircleOutlined, EyeOutlined, LikeOutlined, RightOutlined } from '@ant-design/icons';
import type { HelpArticle } from '@/services/help';
import dayjs from 'dayjs';

const { Text } = Typography;
const { useToken } = theme;

interface ArticleSectionProps {
  popularArticles: HelpArticle[];
  latestArticles: HelpArticle[];
  onArticleClick: (articleId: string) => void;
  onViewAllClick: () => void;
}

/**
 * 文章列表区域组件（热门 + 最新）（优化版）
 */
export const ArticleSection: React.FC<ArticleSectionProps> = React.memo(({
  popularArticles,
  latestArticles,
  onArticleClick,
  onViewAllClick,
}) => {
  const { token } = useToken();
  return (
    <div style={{ marginBottom: 48 }}>
      <style>
        {`
          @keyframes articleSlideIn {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes articleItemSlideIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .article-card {
            border: 1px solid #f0f0f0;
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .article-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08) !important;
            border-color: transparent;
          }
          .article-list-item {
            padding: 16px !important;
            border-radius: 8px;
            transition: all 0.3s ease;
            cursor: pointer;
            border: 1px solid transparent;
          }
          .article-list-item:hover {
            background: #fafafa;
            border-color: #e8e8e8;
            transform: translateX(4px);
          }
          .article-icon-container {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 10px;
            transition: transform 0.3s ease;
          }
          .article-card:hover .article-icon-container {
            transform: scale(1.1) rotate(5deg);
          }
        `}
      </style>

      {/* 标题区域 */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 4, height: 28, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 2, marginRight: 12 }} />
        <Typography.Title level={3} style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
          精选文章
        </Typography.Title>
      </div>

      <Row gutter={[24, 24]}>
        {/* 热门文章 */}
        <Col xs={24} lg={12}>
          <Card
            className="article-card"
            title={
              <Space size={12}>
                <div
                  className="article-icon-container"
                  style={{
                    background: 'linear-gradient(135deg, #ff4d4f15, #ff4d4f25)',
                    boxShadow: '0 4px 12px rgba(255, 77, 79, 0.2)',
                  }}
                >
                  <FireOutlined style={{ color: token.colorError, fontSize: 20 }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: 16 }}>热门文章</span>
              </Space>
            }
            extra={
              <Button
                type="link"
                onClick={onViewAllClick}
                style={{ fontWeight: 500 }}
                icon={<RightOutlined />}
              >
                查看全部
              </Button>
            }
            styles={{ body: { padding: '12px 24px 24px' } }}
            style={{
              animation: 'articleSlideIn 0.5s ease-out',
            }}
          >
            {popularArticles.length > 0 ? (
              <List
                dataSource={popularArticles}
                split={false}
                renderItem={(article, index) => (
                  <List.Item
                    key={article.id}
                    className="article-list-item"
                    onClick={() => onArticleClick(article.id)}
                    style={{
                      animation: `articleItemSlideIn 0.4s ease-out ${index * 0.08}s backwards`,
                    }}
                  >
                    <List.Item.Meta
                      title={
                        <Space size={8} style={{ width: '100%', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 500, color: '#1e293b', flex: 1 }}>
                            {article.title}
                          </span>
                          <Tag
                            color="blue"
                            style={{
                              borderRadius: 4,
                              fontSize: 12,
                              padding: '2px 8px',
                              border: 'none',
                            }}
                          >
                            {article.categoryName}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Space size={16} style={{ fontSize: 12, marginTop: 8 }}>
                          <Space size={4}>
                            <EyeOutlined style={{ color: '#94a3b8' }} />
                            <span style={{ color: '#64748b' }}>{article.views}</span>
                          </Space>
                          <Space size={4}>
                            <LikeOutlined style={{ color: '#94a3b8' }} />
                            <span style={{ color: '#64748b' }}>{article.likes}</span>
                          </Space>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无热门文章" />
            )}
          </Card>
        </Col>

        {/* 最新文章 */}
        <Col xs={24} lg={12}>
          <Card
            className="article-card"
            title={
              <Space size={12}>
                <div
                  className="article-icon-container"
                  style={{
                    background: 'linear-gradient(135deg, #1677ff15, #1677ff25)',
                    boxShadow: '0 4px 12px rgba(24, 144, 255, 0.2)',
                  }}
                >
                  <ClockCircleOutlined style={{ color: token.colorPrimary, fontSize: 20 }} />
                </div>
                <span style={{ fontWeight: 600, fontSize: 16 }}>最新文章</span>
              </Space>
            }
            extra={
              <Button
                type="link"
                onClick={onViewAllClick}
                style={{ fontWeight: 500 }}
                icon={<RightOutlined />}
              >
                查看全部
              </Button>
            }
            styles={{ body: { padding: '12px 24px 24px' } }}
            style={{
              animation: 'articleSlideIn 0.5s ease-out 0.1s backwards',
            }}
          >
            {latestArticles.length > 0 ? (
              <List
                dataSource={latestArticles}
                split={false}
                renderItem={(article, index) => (
                  <List.Item
                    key={article.id}
                    className="article-list-item"
                    onClick={() => onArticleClick(article.id)}
                    style={{
                      animation: `articleItemSlideIn 0.4s ease-out ${index * 0.08}s backwards`,
                    }}
                  >
                    <List.Item.Meta
                      title={
                        <Space size={8} style={{ width: '100%', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: 500, color: '#1e293b', flex: 1 }}>
                            {article.title}
                          </span>
                          <Tag
                            color="green"
                            style={{
                              borderRadius: 4,
                              fontSize: 12,
                              padding: '2px 8px',
                              border: 'none',
                            }}
                          >
                            {article.categoryName}
                          </Tag>
                        </Space>
                      }
                      description={
                        <Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                          {dayjs(article.createdAt).fromNow()}
                        </Text>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="暂无最新文章" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
});

ArticleSection.displayName = 'ArticleSection';
