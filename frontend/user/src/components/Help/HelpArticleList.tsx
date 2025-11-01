import React from 'react';
import { Card, List, Tag, Space, Typography } from 'antd';
import {
  EyeOutlined,
  LikeOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  views?: number;
  likes?: number;
  createdAt?: string;
}

interface HelpArticleListProps {
  title: string;
  articles: HelpArticle[];
  type: 'popular' | 'latest';
  onArticleClick: (articleId: string) => void;
}

/**
 * 帮助文章列表组件
 * 支持两种展示模式：热门（显示浏览量和点赞）、最新（显示时间）
 */
export const HelpArticleList: React.FC<HelpArticleListProps> = React.memo(({
  title,
  articles,
  type,
  onArticleClick,
}) => {
  return (
    <Card
      title={<Title level={4}>{title}</Title>}
      extra={
        <Text type="secondary">
          <FileTextOutlined /> {articles.length} 篇
        </Text>
      }
    >
      <List
        dataSource={articles}
        renderItem={(article) => (
          <List.Item
            style={{ cursor: 'pointer' }}
            onClick={() => onArticleClick(article.id)}
          >
            <List.Item.Meta
              title={
                <Space>
                  <Text strong>{article.title}</Text>
                  <Tag color="blue">{article.category}</Tag>
                </Space>
              }
              description={
                <Space size="large">
                  {type === 'popular' ? (
                    <>
                      <Text type="secondary">
                        <EyeOutlined /> {article.views || 0}
                      </Text>
                      <Text type="secondary">
                        <LikeOutlined /> {article.likes || 0}
                      </Text>
                    </>
                  ) : (
                    <Text type="secondary">
                      <ClockCircleOutlined />{' '}
                      {article.createdAt
                        ? dayjs(article.createdAt).format('YYYY-MM-DD HH:mm')
                        : '-'}
                    </Text>
                  )}
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
});

HelpArticleList.displayName = 'HelpArticleList';
