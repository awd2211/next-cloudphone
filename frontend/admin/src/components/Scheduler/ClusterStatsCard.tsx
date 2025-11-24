import { memo } from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import {
  CloudServerOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import type { ClusterStats } from '@/services/scheduler';

interface ClusterStatsCardProps {
  clusterStats: ClusterStats | null;
}

export const ClusterStatsCard = memo<ClusterStatsCardProps>(({ clusterStats }) => {
  const getProgressStatus = (percent: number) => {
    if (percent > 80) return 'exception';
    if (percent > 60) return 'normal';
    return 'success';
  };

  // 适配新 API 格式
  const totalNodes = clusterStats?.nodes?.total ?? clusterStats?.totalNodes ?? 0;
  const activeNodes = clusterStats?.nodes?.online ?? clusterStats?.activeNodes ?? 0;
  const cpuUtilization = clusterStats?.utilization?.cpu ?? clusterStats?.utilizationRate?.cpu ?? 0;
  const memoryUtilization = clusterStats?.utilization?.memory ?? clusterStats?.utilizationRate?.memory ?? 0;
  const storageUtilization = clusterStats?.utilization?.storage ?? clusterStats?.utilizationRate?.storage ?? 0;
  const cpuUsage = clusterStats?.usage?.cpuCores ?? clusterStats?.totalUsage?.cpu ?? 0;
  const cpuCapacity = clusterStats?.capacity?.cpuCores ?? clusterStats?.totalCapacity?.cpu ?? 0;
  const memoryUsageMB = clusterStats?.usage?.memoryMB ?? (clusterStats?.totalUsage?.memory ?? 0);
  const memoryCapacityMB = clusterStats?.capacity?.memoryMB ?? (clusterStats?.totalCapacity?.memory ?? 0);
  const storageUsageGB = clusterStats?.usage?.storageGB ?? ((clusterStats?.totalUsage?.storage ?? 0) / 1024);
  const storageCapacityGB = clusterStats?.capacity?.storageGB ?? ((clusterStats?.totalCapacity?.storage ?? 0) / 1024);

  return (
    <Card
      title={
        <span>
          <DashboardOutlined /> 集群概览
        </span>
      }
    >
      <Row gutter={16}>
        <Col span={6}>
          <Statistic
            title="总节点数"
            value={totalNodes}
            prefix={<CloudServerOutlined />}
          />
        </Col>
        <Col span={18}>
          <Statistic
            title="活跃节点"
            value={activeNodes}
            valueStyle={{ color: '#52c41a' }}
            prefix={<CheckCircleOutlined />}
          />
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: '24px' }}>
        <Col span={8}>
          <Card size="small" title="CPU 使用率">
            <Progress
              percent={Math.round(cpuUtilization)}
              status={getProgressStatus(cpuUtilization)}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
              {cpuUsage} / {cpuCapacity} 核
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="内存使用率">
            <Progress
              percent={Math.round(memoryUtilization)}
              status={getProgressStatus(memoryUtilization)}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
              {(memoryUsageMB / 1024).toFixed(1)} /{' '}
              {(memoryCapacityMB / 1024).toFixed(1)} GB
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="存储使用率">
            <Progress
              percent={Math.round(storageUtilization)}
              status={getProgressStatus(storageUtilization)}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
              {storageUsageGB.toFixed(1)} /{' '}
              {storageCapacityGB.toFixed(1)} GB
            </div>
          </Card>
        </Col>
      </Row>
    </Card>
  );
});

ClusterStatsCard.displayName = 'ClusterStatsCard';
