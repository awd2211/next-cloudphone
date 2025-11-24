import React from 'react';
import { Row, Col, Card, Statistic, theme } from 'antd';
import {
  FileTextOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

const { useToken } = theme;

interface BillStats {
  total: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

interface BillStatsCardsProps {
  stats: BillStats | null;
}

/**
 * 账单统计卡片组件
 * 展示总账单数、总金额、已支付、未支付统计
 */
export const BillStatsCards: React.FC<BillStatsCardsProps> = React.memo(({ stats }) => {
  const { token } = useToken();

  if (!stats) return null;

  return (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="总账单数"
            value={stats.total}
            prefix={<FileTextOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="总金额"
            value={stats.totalAmount}
            precision={2}
            prefix={<DollarOutlined />}
            valueStyle={{ color: token.colorPrimary }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="已支付"
            value={stats.paidAmount}
            precision={2}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: token.colorSuccess }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="未支付"
            value={stats.unpaidAmount}
            precision={2}
            prefix={<ClockCircleOutlined />}
            valueStyle={{ color: token.colorWarning }}
          />
        </Card>
      </Col>
    </Row>
  );
});

BillStatsCards.displayName = 'BillStatsCards';
