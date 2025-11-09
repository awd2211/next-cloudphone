import { memo } from 'react';
import { Row, Col, Card, Statistic , theme } from 'antd';
import type { AuditLogStatistics } from '@/types';

export interface AuditStatsCardsProps {
  statistics: AuditLogStatistics | null;
}

/**
 * 审计日志统计卡片组件
 */
export const AuditStatsCards = memo<AuditStatsCardsProps>(({ statistics }) => {
  const { token } = theme.useToken();
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col span={6}>
        <Card>
          <Statistic
            title="总日志数"
            value={statistics?.total || 0}
            valueStyle={{ color: token.colorPrimary }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="成功率"
            value={statistics?.successRate || 0}
            suffix="%"
            precision={2}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="今日活动"
            value={statistics?.recentActivity.day || 0}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="本周活动"
            value={statistics?.recentActivity.week || 0}
            valueStyle={{ color: '#13c2c2' }}
          />
        </Card>
      </Col>
    </Row>
  );
});

AuditStatsCards.displayName = 'AuditStatsCards';
