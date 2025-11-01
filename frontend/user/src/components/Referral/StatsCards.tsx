import React from 'react';
import { Row, Col, Card, Statistic, Button } from 'antd';
import { TeamOutlined, GiftOutlined } from '@ant-design/icons';
import type { ReferralStats } from '@/services/referral';

interface StatsCardsProps {
  stats: ReferralStats | null;
  onViewRecords: () => void;
}

/**
 * 邀请统计卡片组件
 *
 * 优化点：
 * - 使用 React.memo 防止不必要的重渲染
 * - Props 解构清晰
 */
export const StatsCards: React.FC<StatsCardsProps> = React.memo(({ stats, onViewRecords }) => {
  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
      {/* 累计邀请 */}
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="累计邀请"
            value={stats?.totalInvites || 0}
            suffix="人"
            prefix={<TeamOutlined />}
          />
        </Card>
      </Col>

      {/* 成功邀请 */}
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="成功邀请"
            value={stats?.confirmedInvites || 0}
            suffix="人"
            prefix={<GiftOutlined />}
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>

      {/* 累计收益 */}
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="累计收益"
            value={stats?.totalRewards || 0}
            prefix="¥"
            precision={2}
            valueStyle={{ color: '#cf1322' }}
          />
        </Card>
      </Col>

      {/* 可提现余额 */}
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="可提现余额"
            value={stats?.availableBalance || 0}
            prefix="¥"
            precision={2}
            valueStyle={{ color: '#faad14' }}
          />
          <Button
            type="link"
            size="small"
            onClick={onViewRecords}
            style={{ padding: 0, marginTop: 8 }}
          >
            查看提现记录 →
          </Button>
        </Card>
      </Col>
    </Row>
  );
});

StatsCards.displayName = 'StatsCards';
