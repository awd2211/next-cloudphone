/**
 * LifecycleExecutionStats - 生命周期规则执行统计组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Space } from 'antd';
import { NEUTRAL_LIGHT } from '@/theme';
import dayjs from 'dayjs';

interface LifecycleExecutionStatsProps {
  executionCount: number;
  lastExecutedAt?: string | null;
}

/**
 * LifecycleExecutionStats 组件
 * 显示规则的执行次数和上次执行时间
 */
export const LifecycleExecutionStats = memo<LifecycleExecutionStatsProps>(
  ({ executionCount, lastExecutedAt }) => {
    return (
      <Space direction="vertical" size={0}>
        <span>已执行: {executionCount} 次</span>
        {lastExecutedAt && (
          <span style={{ fontSize: '12px', color: NEUTRAL_LIGHT.text.tertiary }}>
            上次: {dayjs(lastExecutedAt).format('MM-DD HH:mm')}
          </span>
        )}
      </Space>
    );
  }
);

LifecycleExecutionStats.displayName = 'LifecycleExecutionStats';
