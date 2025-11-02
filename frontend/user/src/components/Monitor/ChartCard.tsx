import React from 'react';
import { Card, Empty } from 'antd';
import { Line } from '@ant-design/charts';

interface ChartCardProps {
  title: string;
  data: any[];
  config: any;
}

/**
 * 图表卡片组件（可复用）
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 支持空状态显示
 * - 通用的图表容器
 */
export const ChartCard: React.FC<ChartCardProps> = React.memo(({ title, data, config }) => {
  return (
    <Card title={title} bordered={false}>
      {data.length > 0 ? (
        <Line {...config} />
      ) : (
        <Empty description="暂无历史数据" style={{ padding: '40px 0' }} />
      )}
    </Card>
  );
});

ChartCard.displayName = 'ChartCard';
