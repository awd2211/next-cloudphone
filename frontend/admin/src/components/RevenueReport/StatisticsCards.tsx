import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { ShoppingOutlined } from '@ant-design/icons';

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
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={8}>
        <Card loading={loading}>
          <Statistic
            title="总收入"
            value={totalRevenue}
            prefix="¥"
            precision={2}
            valueStyle={{ color: '#cf1322' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={8}>
        <Card loading={loading}>
          <Statistic
            title="总订单数"
            value={totalOrders}
            prefix={<ShoppingOutlined />}
            valueStyle={{ color: '#1890ff' }}
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
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
    </Row>
  );
};
