import React from 'react';
import { Card, Row, Col, Progress } from 'antd';
import type { MeteringOverview } from './constants';
import { getProgressStatus } from './constants';

interface ResourceUsageCardsProps {
  overview: MeteringOverview | null;
}

export const ResourceUsageCards: React.FC<ResourceUsageCardsProps> = React.memo(
  ({ overview }) => {
    return (
      <Card title="资源使用率">
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ marginBottom: '8px' }}>CPU 使用率</div>
            <Progress
              percent={Math.round(overview?.cpuUsage || 0)}
              status={getProgressStatus(overview?.cpuUsage || 0)}
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: '8px' }}>内存使用率</div>
            <Progress
              percent={Math.round(overview?.memoryUsage || 0)}
              status={getProgressStatus(overview?.memoryUsage || 0)}
            />
          </Col>
          <Col span={8}>
            <div style={{ marginBottom: '8px' }}>存储使用率</div>
            <Progress
              percent={Math.round(overview?.storageUsage || 0)}
              status={getProgressStatus(overview?.storageUsage || 0)}
            />
          </Col>
        </Row>
      </Card>
    );
  }
);

ResourceUsageCards.displayName = 'ResourceUsageCards';
