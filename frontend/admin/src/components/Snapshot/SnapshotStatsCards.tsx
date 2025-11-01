import { memo } from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import { formatSize, calculateStorageUsage } from './utils';

export interface SnapshotStatsCardsProps {
  totalSnapshots: number;
  totalSize: number;
  avgSize: number;
}

/**
 * 快照统计卡片组件
 */
export const SnapshotStatsCards = memo<SnapshotStatsCardsProps>(
  ({ totalSnapshots, totalSize, avgSize }) => {
    const storageUsage = calculateStorageUsage(totalSize);

    return (
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="总快照数" value={totalSnapshots} prefix={<DatabaseOutlined />} />
          </Col>
          <Col span={6}>
            <Statistic
              title="总存储大小"
              value={formatSize(totalSize)}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均快照大小"
              value={formatSize(avgSize)}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <div>
              <div style={{ marginBottom: '8px', fontSize: '14px', color: 'rgba(0, 0, 0, 0.45)' }}>
                存储使用率
              </div>
              <Progress percent={Math.round(storageUsage)} status="active" />
            </div>
          </Col>
        </Row>
      </Card>
    );
  },
);

SnapshotStatsCards.displayName = 'SnapshotStatsCards';
