import { memo } from 'react';
import { Space, Typography, Paragraph as AntParagraph, Radio, Tag } from 'antd';

const { Title, Paragraph } = Typography;

interface PricingHeroProps {
  billingCycle: 'monthly' | 'yearly';
  onBillingCycleChange: (value: 'monthly' | 'yearly') => void;
}

export const PricingHero = memo<PricingHeroProps>(
  ({ billingCycle, onBillingCycleChange }) => {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '80px 24px',
          textAlign: 'center',
          color: 'white',
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Title level={1} style={{ color: 'white', fontSize: 48, marginBottom: 0 }}>
            简单透明的定价
          </Title>
          <Paragraph
            style={{
              fontSize: 20,
              color: 'rgba(255, 255, 255, 0.9)',
              maxWidth: 600,
              margin: '0 auto',
            }}
          >
            无隐藏费用，按需付费，随时取消
          </Paragraph>
          <div style={{ marginTop: 16 }}>
            <Radio.Group
              value={billingCycle}
              onChange={(e) => onBillingCycleChange(e.target.value)}
              size="large"
              buttonStyle="solid"
            >
              <Radio.Button value="monthly">按月付费</Radio.Button>
              <Radio.Button value="yearly">
                按年付费
                <Tag color="red" style={{ marginLeft: 8 }}>
                  省20%
                </Tag>
              </Radio.Button>
            </Radio.Group>
          </div>
        </Space>
      </div>
    );
  }
);

PricingHero.displayName = 'PricingHero';
