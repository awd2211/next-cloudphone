import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import {
  BellOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { NotificationStats } from '@/services/notification';

interface MessageStatsCardsProps {
  stats: NotificationStats | null;
}

/**
 * 消息统计卡片组件
 * 展示全部、未读、今日、本周消息统计
 */
export const MessageStatsCards: React.FC<MessageStatsCardsProps> = React.memo(({ stats }) => {
  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic title="全部消息" value={stats?.total || 0} prefix={<BellOutlined />} />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="未读消息"
            value={stats?.unread || 0}
            valueStyle={{ color: '#faad14' }}
            prefix={<ExclamationCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="今日消息"
            value={stats?.today || 0}
            valueStyle={{ color: '#1890ff' }}
            prefix={<ClockCircleOutlined />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic
            title="本周消息"
            value={stats?.thisWeek || 0}
            valueStyle={{ color: '#52c41a' }}
            prefix={<CheckCircleOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );
});

MessageStatsCards.displayName = 'MessageStatsCards';
