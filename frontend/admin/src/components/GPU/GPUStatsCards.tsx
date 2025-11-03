import { memo } from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import {
  ThunderboltOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  FireOutlined,
} from '@ant-design/icons';
import type { GPUStats } from '@/types';

export interface GPUStatsCardsProps {
  stats: GPUStats | null;
}

/**
 * GPU 统计卡片组件
 */
export const GPUStatsCards = memo<GPUStatsCardsProps>(({ stats }) => {
  return (
    <Row gutter={16}>
      <Col span={6}>
        <Card>
          <Statistic
            title="GPU 总数"
            value={stats?.totalGPUs || 0}
            prefix={<ThunderboltOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="在线 GPU"
            value={stats?.onlineGPUs || 0}
            valueStyle={{ color: '#52c41a' }}
            prefix={<CheckCircleOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="平均使用率"
            value={stats?.avgUtilization || 0}
            precision={1}
            suffix="%"
            valueStyle={{ color: (stats?.avgUtilization || 0) > 80 ? '#ff4d4f' : '#52c41a' }}
            prefix={<DashboardOutlined />}
          />
        </Card>
      </Col>
      <Col span={6}>
        <Card>
          <Statistic
            title="平均温度"
            value={stats?.avgTemperature || 0}
            precision={1}
            suffix="°C"
            valueStyle={{ color: (stats?.avgTemperature || 0) > 75 ? '#ff4d4f' : '#52c41a' }}
            prefix={<FireOutlined />}
          />
        </Card>
      </Col>
    </Row>
  );
});

GPUStatsCards.displayName = 'GPUStatsCards';
