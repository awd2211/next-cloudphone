import React from 'react';
import { Row, Col, Card, Statistic, theme } from 'antd';
import { ShoppingOutlined } from '@ant-design/icons';
import { SEMANTIC } from '@/theme';

interface StatisticsCardsProps {
  loading: boolean;
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
}

export const StatisticsCards: React.FC<StatisticsCardsProps> = ({
  loading,
  totalRevenue,
  totalOrders,
  avgOrderValue,
}) => {
  const { token } = theme.useToken();

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={8}>
        <Card loading={loading}>
          <Statistic
            title="总收入"
            value={totalRevenue}
            prefix="¥"
            precision={2}
            valueStyle={{ color: SEMANTIC.error.dark }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card loading={loading}>
          <Statistic
            title="总订单数"
            value={totalOrders}
            prefix={<ShoppingOutlined />}
            valueStyle={{ color: token.colorPrimary }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card loading={loading}>
          <Statistic
            title="平均订单价值"
            value={avgOrderValue}
            prefix="¥"
            precision={2}
            valueStyle={{ color: SEMANTIC.success.dark }}
          />
        </Card>
      </Col>
    </Row>
  );
};
