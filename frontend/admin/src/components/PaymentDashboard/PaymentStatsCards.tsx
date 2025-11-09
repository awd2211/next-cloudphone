import React from 'react';
import { Row, Col, Card, Statistic , theme } from 'antd';
import { DollarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import type { PaymentStatistics } from '@/services/payment-admin';

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
              valueStyle={{ color: '#3f8600' }}
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
              valueStyle={{ color: '#52c41a' }}
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
                <span style={{ fontSize: '14px', color: '#666' }}>
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
              valueStyle={{ color: '#cf1322' }}
              suffix={
                <span style={{ fontSize: '14px', color: '#666' }}>
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
