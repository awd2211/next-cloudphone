import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { formatBytes } from '@/utils/monitorConfig';

interface NetworkStatsProps {
  networkIn: number;
  networkOut: number;
}

/**
 * 网络流量统计组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 显示入站和出站流量
 */
export const NetworkStats: React.FC<NetworkStatsProps> = React.memo(({ networkIn, networkOut }) => {
  return (
    <Card title="网络流量" bordered={false}>
      <Row gutter={16}>
        <Col xs={12} md={6}>
          <Statistic
            title="入站流量"
            value={formatBytes(networkIn)}
            valueStyle={{ color: '#3f8600' }}
          />
        </Col>
        <Col xs={12} md={6}>
          <Statistic
            title="出站流量"
            value={formatBytes(networkOut)}
            valueStyle={{ color: '#1890ff' }}
          />
        </Col>
      </Row>
    </Card>
  );
});

NetworkStats.displayName = 'NetworkStats';
