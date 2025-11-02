import React from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import { formatSize, type Snapshot } from '@/utils/snapshotConfig';

interface StatsCardsProps {
  snapshots: Snapshot[];
}

/**
 * 统计卡片组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 统计数据动态计算
 * - 响应式布局
 */
export const StatsCards: React.FC<StatsCardsProps> = React.memo(({ snapshots }) => {
  const totalCount = snapshots.length;
  const activeCount = snapshots.filter((s) => s.status === 'active').length;
  const totalSize = snapshots.reduce((sum, snapshot) => sum + snapshot.size, 0);

  return (
    <Row gutter={16} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12} md={8}>
        <Card>
          <Statistic title="快照总数" value={totalCount} suffix="个" />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Card>
          <Statistic
            title="可用快照"
            value={activeCount}
            suffix="个"
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={8}>
        <Card>
          <Statistic title="总占用空间" value={formatSize(totalSize)} />
        </Card>
      </Col>
    </Row>
  );
});

StatsCards.displayName = 'StatsCards';
