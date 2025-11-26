import { memo } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import {
  ShoppingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { PRIMARY, SEMANTIC } from '@/theme';

interface OrderStatsCardsProps {
  total: number;
  pending: number;
  paid: number;
  cancelled: number;
}

export const OrderStatsCards = memo<OrderStatsCardsProps>(
  ({ total, pending, paid, cancelled }) => {
    return (
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总订单数"
              value={total}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: PRIMARY.main }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待支付"
              value={pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: SEMANTIC.warning.main }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已支付"
              value={paid}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: SEMANTIC.success.main }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已取消"
              value={cancelled}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: SEMANTIC.error.main }}
            />
          </Card>
        </Col>
      </Row>
    );
  }
);

OrderStatsCards.displayName = 'OrderStatsCards';
