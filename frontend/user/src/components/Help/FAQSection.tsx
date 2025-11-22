import React from 'react';
import { Card, List, Space, Button, Typography } from 'antd';
import { QuestionCircleOutlined, EyeOutlined, LikeOutlined, RightOutlined } from '@ant-design/icons';
import type { FAQ } from '@/services/help';

interface FAQSectionProps {
  popularFAQs: FAQ[];
  onFAQClick: (faqId: string) => void;
  onViewAllClick: () => void;
}

/**
 * FAQ 列表区域组件（优化版）
 */
export const FAQSection: React.FC<FAQSectionProps> = React.memo(({
  popularFAQs,
  onFAQClick,
  onViewAllClick,
}) => {
  if (popularFAQs.length === 0) return null;

  return (
    <div style={{ marginBottom: 48 }}>
      <style>
        {`
          @keyframes faqSlideIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          @keyframes faqItemSlideIn {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes badgePulse {
            0%, 100% {
              transform: scale(1);
              box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.4);
            }
            50% {
              transform: scale(1.05);
              box-shadow: 0 0 0 6px rgba(82, 196, 26, 0);
            }
          }
          .faq-card {
            border: 1px solid #f0f0f0;
            border-radius: 12px;
            overflow: hidden;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .faq-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.08) !important;
            border-color: transparent;
          }
          .faq-list-item {
            padding: 20px !important;
            border-radius: 8px;
            transition: all 0.3s ease;
            cursor: pointer;
            border: 1px solid transparent;
            position: relative;
          }
          .faq-list-item:hover {
            background: linear-gradient(135deg, #52c41a08, #52c41a12);
            border-color: #52c41a40;
            transform: translateX(8px);
          }
          .faq-list-item::before {
            content: '';
            position: absolute;
            left: 0;
            top: 0;
            bottom: 0;
            width: 4px;
            background: linear-gradient(135deg, #52c41a, #73d13d);
            transform: scaleY(0);
            transition: transform 0.3s ease;
          }
          .faq-list-item:hover::before {
            transform: scaleY(1);
          }
          .faq-badge {
            width: 40px;
            height: 40px;
            borderRadius: 12px;
            background: linear-gradient(135deg, #52c41a15, #52c41a25);
            display: flex;
            align-items: center;
            justify-content: center;
            fontWeight: 700;
            fontSize: 16px;
            color: #52c41a;
            transition: all 0.3s ease;
            boxShadow: 0 4px 12px rgba(82, 196, 26, 0.2);
          }
          .faq-list-item:hover .faq-badge {
            animation: badgePulse 1s ease-in-out;
            background: linear-gradient(135deg, #52c41a, #73d13d);
            color: #fff;
          }
          .faq-arrow {
            color: #d1d5db;
            transition: all 0.3s ease;
          }
          .faq-list-item:hover .faq-arrow {
            color: #52c41a;
            transform: translateX(4px);
          }
        `}
      </style>

      {/* 标题区域 */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center' }}>
        <div style={{ width: 4, height: 28, background: 'linear-gradient(135deg, #52c41a 0%, #73d13d 100%)', borderRadius: 2, marginRight: 12 }} />
        <Typography.Title level={3} style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>
          常见问题
        </Typography.Title>
      </div>

      <Card
        className="faq-card"
        title={
          <Space size={12}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #52c41a15, #52c41a25)',
                boxShadow: '0 4px 12px rgba(82, 196, 26, 0.2)',
              }}
            >
              <QuestionCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
            </div>
            <span style={{ fontWeight: 600, fontSize: 16 }}>热门问答</span>
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
          animation: 'faqSlideIn 0.5s ease-out',
        }}
      >
        <List
          dataSource={popularFAQs}
          split={false}
          renderItem={(faq, index) => (
            <List.Item
              key={faq.id}
              className="faq-list-item"
              onClick={() => onFAQClick(faq.id)}
              style={{
                animation: `faqItemSlideIn 0.4s ease-out ${index * 0.08}s backwards`,
              }}
            >
              <List.Item.Meta
                avatar={
                  <div className="faq-badge">
                    {index + 1}
                  </div>
                }
                title={
                  <span style={{ fontWeight: 500, color: '#1e293b', fontSize: 15 }}>
                    {faq.question}
                  </span>
                }
                description={
                  <Space size={16} style={{ fontSize: 12, marginTop: 8 }}>
                    <Space size={4}>
                      <EyeOutlined style={{ color: '#94a3b8' }} />
                      <span style={{ color: '#64748b' }}>{faq.views} 次浏览</span>
                    </Space>
                    <Space size={4}>
                      <LikeOutlined style={{ color: '#94a3b8' }} />
                      <span style={{ color: '#64748b' }}>{faq.helpfulCount} 人觉得有用</span>
                    </Space>
                  </Space>
                }
              />
              <RightOutlined className="faq-arrow" />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
});

FAQSection.displayName = 'FAQSection';
