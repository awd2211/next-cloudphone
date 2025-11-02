import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { ThunderboltOutlined, GiftOutlined, TrophyOutlined } from '@ant-design/icons';

interface StatsCardsProps {
  stats: {
    ongoingActivities: number;
    availableCoupons: number;
    myCoupons: number;
    totalParticipations: number;
    totalRewards: number;
  } | null;
}

/**
 * 统计卡片组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 条件渲染（无统计数据时不显示）
 * - 响应式布局
 */
export const StatsCards: React.FC<StatsCardsProps> = React.memo(({ stats }) => {
  if (!stats) return null;

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="进行中活动"
            value={stats.ongoingActivities}
            prefix={<ThunderboltOutlined />}
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="我的优惠券"
            value={stats.availableCoupons}
            suffix={`/ ${stats.myCoupons}`}
            prefix={<GiftOutlined />}
            valueStyle={{ color: '#cf1322' }}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="参与次数"
            value={stats.totalParticipations}
            prefix={<TrophyOutlined />}
          />
        </Card>
      </Col>
      <Col xs={12} sm={6}>
        <Card>
          <Statistic
            title="获得奖励"
            value={stats.totalRewards}
            prefix={<GiftOutlined />}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
      </Col>
    </Row>
  );
});

StatsCards.displayName = 'StatsCards';
