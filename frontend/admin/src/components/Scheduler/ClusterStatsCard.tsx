import { memo } from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import {
  CloudServerOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ToolOutlined,
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
            value={clusterStats?.totalNodes || 0}
            prefix={<CloudServerOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="在线节点"
            value={clusterStats?.onlineNodes || 0}
            valueStyle={{ color: '#52c41a' }}
            prefix={<CheckCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="离线节点"
            value={clusterStats?.offlineNodes || 0}
            valueStyle={{ color: '#ff4d4f' }}
            prefix={<CloseCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="维护中"
            value={clusterStats?.maintenanceNodes || 0}
            valueStyle={{ color: '#faad14' }}
            prefix={<ToolOutlined />}
          />
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: '24px' }}>
        <Col span={8}>
          <Card size="small" title="CPU 使用率">
            <Progress
              percent={Math.round(clusterStats?.utilizationRate.cpu || 0)}
              status={getProgressStatus(clusterStats?.utilizationRate.cpu || 0)}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
              {clusterStats?.totalUsage.cpu || 0} / {clusterStats?.totalCapacity.cpu || 0} 核
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="内存使用率">
            <Progress
              percent={Math.round(clusterStats?.utilizationRate.memory || 0)}
              status={getProgressStatus(clusterStats?.utilizationRate.memory || 0)}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
              {((clusterStats?.totalUsage.memory || 0) / 1024).toFixed(1)} /{' '}
              {((clusterStats?.totalCapacity.memory || 0) / 1024).toFixed(1)} GB
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" title="设备使用率">
            <Progress
              percent={Math.round(clusterStats?.utilizationRate.devices || 0)}
              status={getProgressStatus(clusterStats?.utilizationRate.devices || 0)}
            />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#8c8c8c' }}>
              {clusterStats?.totalUsage.deviceCount || 0} /{' '}
              {clusterStats?.totalCapacity.maxDevices || 0} 台
            </div>
          </Card>
        </Col>
      </Row>
    </Card>
  );
});

ClusterStatsCard.displayName = 'ClusterStatsCard';
