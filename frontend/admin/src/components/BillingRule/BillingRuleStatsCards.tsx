import { memo } from 'react';
import { Row, Col, Statistic } from 'antd';
import { CodeOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import type { BillingRule } from '@/types';
import { SEMANTIC } from '@/theme';

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
          valueStyle={{ color: SEMANTIC.success.main }}
          prefix={<CheckCircleOutlined />}
        />
      </Col>
      <Col span={8}>
        <Statistic
          title="已停用"
          value={rules.filter((r) => !r.isActive).length}
          valueStyle={{ color: SEMANTIC.error.main }}
          prefix={<CloseCircleOutlined />}
        />
      </Col>
    </Row>
  );
});

BillingRuleStatsCards.displayName = 'BillingRuleStatsCards';
