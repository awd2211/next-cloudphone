import React from 'react';
import { Card, Row, Col, List, Space, Tag, Button, Empty, Typography } from 'antd';
import { FireOutlined, ClockCircleOutlined, EyeOutlined, LikeOutlined, RightOutlined } from '@ant-design/icons';
import type { HelpArticle } from '@/services/help';
import dayjs from 'dayjs';

const { Text } = Typography;

interface ArticleSectionProps {
  popularArticles: HelpArticle[];
  latestArticles: HelpArticle[];
  onArticleClick: (articleId: string) => void;
  onViewAllClick: () => void;
}

/**
 * 文章列表区域组件（热门 + 最新）
 */
export const ArticleSection: React.FC<ArticleSectionProps> = React.memo(({
  popularArticles,
  latestArticles,
  onArticleClick,
  onViewAllClick,
}) => {
  return (
    <Row gutter={16}>
      {/* 热门文章 */}
      <Col xs={24} lg={12}>
        <Card
          title={
            <Space>
              <FireOutlined style={{ color: '#ff4d4f' }} />
              <span>热门文章</span>
            </Space>
          }
          extra={
            <Button type="link" onClick={onViewAllClick}>
              查看全部 <RightOutlined />
            </Button>
          }
          style={{ marginBottom: 16 }}
        >
          {popularArticles.length > 0 ? (
            <List
              dataSource={popularArticles}
              renderItem={(article) => (
                <List.Item
                  key={article.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onArticleClick(article.id)}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{article.title}</span>
                        <Tag color="blue">{article.categoryName}</Tag>
                      </Space>
                    }
                    description={
                      <Space size="large" style={{ fontSize: 12 }}>
                        <Space size="small">
                          <EyeOutlined />
                          <span>{article.views}</span>
                        </Space>
                        <Space size="small">
                          <LikeOutlined />
                          <span>{article.likes}</span>
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
          title={
            <Space>
              <ClockCircleOutlined style={{ color: '#1890ff' }} />
              <span>最新文章</span>
            </Space>
          }
          extra={
            <Button type="link" onClick={onViewAllClick}>
              查看全部 <RightOutlined />
            </Button>
          }
          style={{ marginBottom: 16 }}
        >
          {latestArticles.length > 0 ? (
            <List
              dataSource={latestArticles}
              renderItem={(article) => (
                <List.Item
                  key={article.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onArticleClick(article.id)}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{article.title}</span>
                        <Tag color="green">{article.categoryName}</Tag>
                      </Space>
                    }
                    description={
                      <Space size="large" style={{ fontSize: 12 }}>
                        <Text type="secondary">{dayjs(article.createdAt).fromNow()}</Text>
                      </Space>
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
  );
});

ArticleSection.displayName = 'ArticleSection';
