import React from 'react';
import { Row, Col } from 'antd';
import {
  ThunderboltOutlined,
  DatabaseOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { StatCard } from './StatCard';
import { formatBytes, formatUptime } from '@/utils/monitorConfig';

interface DeviceStats {
  cpuUsage: number;
  memoryUsed: number;
  memoryTotal: number;
  storageUsed: number;
  storageTotal: number;
  networkIn: number;
  networkOut: number;
  uptime: number;
}

interface StatsCardsProps {
  stats: DeviceStats;
}

/**
 * 统计卡片容器组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 4 个统计卡片：CPU、内存、存储、运行时长
 * - 复用 StatCard 组件
 */
export const StatsCards: React.FC<StatsCardsProps> = React.memo(({ stats }) => {
  const memoryPercent = (stats.memoryUsed / stats.memoryTotal) * 100;
  const storagePercent = (stats.storageUsed / stats.storageTotal) * 100;

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={6}>
        <StatCard
          title="CPU使用率"
          value={stats.cpuUsage}
          precision={1}
          suffix="%"
          icon={<ThunderboltOutlined />}
          showProgress
          progressPercent={stats.cpuUsage}
        />
      </Col>

      <Col xs={24} sm={12} md={6}>
        <StatCard
          title="内存使用"
          value={memoryPercent}
          precision={1}
          suffix="%"
          icon={<DatabaseOutlined />}
          showProgress
          progressPercent={memoryPercent}
          description={`${formatBytes(stats.memoryUsed)} / ${formatBytes(stats.memoryTotal)}`}
        />
      </Col>

      <Col xs={24} sm={12} md={6}>
        <StatCard
          title="存储使用"
          value={storagePercent}
          precision={1}
          suffix="%"
          icon={<DatabaseOutlined />}
          showProgress
          progressPercent={storagePercent}
          description={`${formatBytes(stats.storageUsed)} / ${formatBytes(stats.storageTotal)}`}
        />
      </Col>

      <Col xs={24} sm={12} md={6}>
        <StatCard
          title="运行时长"
          value={formatUptime(stats.uptime)}
          icon={<ClockCircleOutlined />}
        />
      </Col>
    </Row>
  );
});

StatsCards.displayName = 'StatsCards';
