import React from 'react';
import { Card, Row, Col, Statistic, theme } from 'antd';
import { GiftOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { useToken } = theme;

interface StatsCardsProps {
  stats: {
    total: number;
    available: number;
    used: number;
    expired: number;
  };
}

/**
 * 优惠券统计卡片组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 4 个统计卡片展示
 */
export const StatsCards: React.FC<StatsCardsProps> = React.memo(({ stats }) => {
  const { token } = useToken();

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic title="全部优惠券" value={stats.total} prefix={<GiftOutlined />} />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="可用"
            value={stats.available}
            valueStyle={{ color: token.colorSuccess }}
            prefix={<CheckCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic title="已使用" value={stats.used} prefix={<CheckCircleOutlined />} />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="已过期"
            value={stats.expired}
            valueStyle={{ color: token.colorError }}
            prefix={<CloseCircleOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );
});

StatsCards.displayName = 'StatsCards';
