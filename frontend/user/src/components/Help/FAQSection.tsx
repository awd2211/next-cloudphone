import React from 'react';
import { Card, List, Space, Button } from 'antd';
import { QuestionCircleOutlined, EyeOutlined, LikeOutlined, RightOutlined } from '@ant-design/icons';
import type { FAQ } from '@/services/help';

interface FAQSectionProps {
  popularFAQs: FAQ[];
  onFAQClick: (faqId: string) => void;
  onViewAllClick: () => void;
}

/**
 * FAQ 列表区域组件
 */
export const FAQSection: React.FC<FAQSectionProps> = React.memo(({
  popularFAQs,
  onFAQClick,
  onViewAllClick,
}) => {
  if (popularFAQs.length === 0) return null;

  return (
    <Card
      title={
        <Space>
          <QuestionCircleOutlined style={{ color: '#52c41a' }} />
          <span>常见问题</span>
        </Space>
      }
      extra={
        <Button type="link" onClick={onViewAllClick}>
          查看全部 <RightOutlined />
        </Button>
      }
    >
      <List
        dataSource={popularFAQs}
        renderItem={(faq, index) => (
          <List.Item key={faq.id} style={{ cursor: 'pointer' }} onClick={() => onFAQClick(faq.id)}>
            <List.Item.Meta
              avatar={
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#52c41a20',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    color: '#52c41a',
                  }}
                >
                  {index + 1}
                </div>
              }
              title={faq.question}
              description={
                <Space size="large" style={{ fontSize: 12 }}>
                  <Space size="small">
                    <EyeOutlined />
                    <span>{faq.views} 次浏览</span>
                  </Space>
                  <Space size="small">
                    <LikeOutlined />
                    <span>{faq.helpfulCount} 人觉得有用</span>
                  </Space>
                </Space>
              }
            />
            <RightOutlined style={{ color: '#999' }} />
          </List.Item>
        )}
      />
    </Card>
  );
});

FAQSection.displayName = 'FAQSection';
