import React from 'react';
import { Row, Col, Card, Statistic , theme } from 'antd';
import { DollarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { PaymentStatistics } from '@/services/payment-admin';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';

interface PaymentStatsCardsProps {
  statistics: PaymentStatistics | null;
}

export const PaymentStatsCards: React.FC<PaymentStatsCardsProps> = React.memo(
  ({ statistics }) => {
    const { token } = theme.useToken();
    if (!statistics) return null;

    return (
      <Row gutter={16}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总交易量"
              value={statistics.overview.totalTransactions}
              prefix={<DollarOutlined />}
              valueStyle={{ color: SEMANTIC.success.main }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="成功率"
              value={parseFloat(statistics.overview.successRate)}
              precision={2}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: SEMANTIC.success.main }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总收入"
              value={parseFloat(statistics.revenue.totalRevenue)}
              precision={2}
              prefix="¥"
              valueStyle={{ color: token.colorPrimary }}
              suffix={
                <span style={{ fontSize: '14px', color: NEUTRAL_LIGHT.text.tertiary }}>
                  <br />
                  <small>净收入: ¥{statistics.revenue.netRevenue}</small>
                </span>
              }
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="退款金额"
              value={parseFloat(statistics.revenue.totalRefunded)}
              precision={2}
              prefix="¥"
              valueStyle={{ color: SEMANTIC.error.main }}
              suffix={
                <span style={{ fontSize: '14px', color: NEUTRAL_LIGHT.text.tertiary }}>
                  <br />
                  <small>{statistics.overview.refundedTransactions} 笔</small>
                </span>
              }
            />
          </Card>
        </Col>
      </Row>
    );
  }
);

PaymentStatsCards.displayName = 'PaymentStatsCards';
