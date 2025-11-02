import React, { memo } from 'react';
import { Col, Card, Statistic, Row, Button, Space, Typography } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { DashboardData } from '@/hooks/useDashboard';

const { Text } = Typography;

interface UsageDurationCardsProps {
  data: DashboardData;
}

export const UsageDurationCards = memo<UsageDurationCardsProps>(({ data }) => {
  const navigate = useNavigate();

  return (
    <Col xs={24} md={12}>
      <Card
        title={
          <Space>
            <ClockCircleOutlined />
            <Text strong>使用时长统计</Text>
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card size="small" style={{ textAlign: 'center', background: '#f0f7ff' }}>
              <Statistic
                title="今日"
                value={data.usage.today}
                suffix="小时"
                valueStyle={{ fontSize: 24, color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ textAlign: 'center', background: '#f0f7ff' }}>
              <Statistic
                title="本周"
                value={data.usage.thisWeek}
                suffix="小时"
                valueStyle={{ fontSize: 24, color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ textAlign: 'center', background: '#f0f7ff' }}>
              <Statistic
                title="本月"
                value={data.usage.thisMonth}
                suffix="小时"
                valueStyle={{ fontSize: 24, color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Button type="link" onClick={() => navigate('/usage')}>
            查看详细使用记录 →
          </Button>
        </div>
      </Card>
    </Col>
  );
});

UsageDurationCards.displayName = 'UsageDurationCards';
