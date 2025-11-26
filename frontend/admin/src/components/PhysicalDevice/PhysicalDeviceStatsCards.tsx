import { memo } from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import { WifiOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';

interface PhysicalDeviceStatsCardsProps {
  total: number;
  online: number;
  offline: number;
  onlineRate: number;
}

export const PhysicalDeviceStatsCards = memo<PhysicalDeviceStatsCardsProps>(
  ({ total, online, offline, onlineRate }) => {
    return (
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="总设备数" value={total} prefix={<WifiOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic
              title="在线设备"
              value={online}
              valueStyle={{ color: SEMANTIC.success.main }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="离线设备"
              value={offline}
              valueStyle={{ color: NEUTRAL_LIGHT.text.tertiary }}
              prefix={<CloseCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <div>
              <div style={{ marginBottom: '8px', fontSize: '14px', color: 'rgba(0, 0, 0, 0.45)' }}>
                在线率
              </div>
              <Progress
                percent={onlineRate}
                status={onlineRate > 80 ? 'success' : onlineRate > 50 ? 'normal' : 'exception'}
              />
            </div>
          </Col>
        </Row>
      </Card>
    );
  }
);

PhysicalDeviceStatsCards.displayName = 'PhysicalDeviceStatsCards';
