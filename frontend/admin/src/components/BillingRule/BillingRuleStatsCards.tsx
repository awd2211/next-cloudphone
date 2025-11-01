import { memo } from 'react';
import { Row, Col, Statistic } from 'antd';
import { CodeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { BillingRule } from '@/types';

interface BillingRuleStatsCardsProps {
  total: number;
  rules: BillingRule[];
}

export const BillingRuleStatsCards = memo<BillingRuleStatsCardsProps>(({ total, rules }) => {
  return (
    <Row gutter={16}>
      <Col span={8}>
        <Statistic title="总规则数" value={total} prefix={<CodeOutlined />} />
      </Col>
      <Col span={8}>
        <Statistic
          title="激活中"
          value={rules.filter((r) => r.isActive).length}
          valueStyle={{ color: '#52c41a' }}
          prefix={<CheckCircleOutlined />}
        />
      </Col>
      <Col span={8}>
        <Statistic
          title="已停用"
          value={rules.filter((r) => !r.isActive).length}
          valueStyle={{ color: '#ff4d4f' }}
          prefix={<CloseCircleOutlined />}
        />
      </Col>
    </Row>
  );
});

BillingRuleStatsCards.displayName = 'BillingRuleStatsCards';
