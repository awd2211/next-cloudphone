import { memo } from 'react';
import { Row, Col, Card, Statistic } from 'antd';

export interface SMSStatsCardsProps {
  today: number;
  thisMonth: number;
  successRate: number;
  total: number;
}

/**
 * SMS 统计卡片组件
 */
export const SMSStatsCards = memo<SMSStatsCardsProps>(
  ({ today, thisMonth, successRate, total }) => {
    return (
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic title="今日发送" value={today} suffix="条" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="本月发送" value={thisMonth} suffix="条" />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="发送成功率"
              value={successRate}
              suffix="%"
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="总发送量" value={total} suffix="条" />
          </Card>
        </Col>
      </Row>
    );
  },
);

SMSStatsCards.displayName = 'SMSStatsCards';
