import { memo } from 'react';
import { Card, Row, Col, Statistic, Progress , theme } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import { formatSize, calculateStorageUsage } from './utils';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';

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
    const { token } = theme.useToken();
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
              valueStyle={{ color: SEMANTIC.success.main }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均快照大小"
              value={formatSize(avgSize)}
              valueStyle={{ color: token.colorPrimary }}
            />
          </Col>
          <Col span={6}>
            <div>
              <div style={{ marginBottom: '8px', fontSize: '14px', color: NEUTRAL_LIGHT.text.secondary }}>
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
