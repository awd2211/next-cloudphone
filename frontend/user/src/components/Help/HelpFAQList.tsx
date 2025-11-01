import React from 'react';
import { Card, List, Space, Tag, Typography, Statistic, Row, Col } from 'antd';
import { QuestionCircleOutlined, EyeOutlined, LikeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface FAQ {
  id: string;
  question: string;
  category: string;
  views: number;
  helpful: number;
}

interface FAQStats {
  total: number;
  todayViews: number;
  avgHelpful: number;
}

interface HelpFAQListProps {
  faqs: FAQ[];
  stats: FAQStats;
  onFAQClick: (faqId: string) => void;
}

/**
 * 常见问题列表组件
 * 带编号、统计信息和卡片样式
 */
export const HelpFAQList: React.FC<HelpFAQListProps> = React.memo(({
  faqs,
  stats,
  onFAQClick,
}) => {
  return (
    <Card
      title={
        <Space>
          <QuestionCircleOutlined />
          <Title level={4} style={{ margin: 0 }}>
            常见问题
          </Title>
        </Space>
      }
      style={{ marginBottom: 24 }}
    >
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="总问题数"
              value={stats.total}
              prefix={<QuestionCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="今日浏览"
              value={stats.todayViews}
              prefix={<EyeOutlined />}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="平均有用率"
              value={stats.avgHelpful}
              suffix="%"
              prefix={<LikeOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* FAQ 列表 */}
      <List
        dataSource={faqs}
        renderItem={(faq, index) => (
          <List.Item
            style={{
              cursor: 'pointer',
              padding: '16px',
              background: index % 2 === 0 ? '#fafafa' : '#fff',
              borderRadius: 4,
            }}
            onClick={() => onFAQClick(faq.id)}
          >
            <List.Item.Meta
              avatar={
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#1890ff',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                  }}
                >
                  {index + 1}
                </div>
              }
              title={
                <Space>
                  <Text strong>{faq.question}</Text>
                  <Tag color="blue">{faq.category}</Tag>
                </Space>
              }
              description={
                <Space size="large">
                  <Text type="secondary">
                    <EyeOutlined /> {faq.views} 浏览
                  </Text>
                  <Text type="secondary">
                    <LikeOutlined /> {faq.helpful} 人觉得有用
                  </Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
});

HelpFAQList.displayName = 'HelpFAQList';
