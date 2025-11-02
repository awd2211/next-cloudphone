import React from 'react';
import { Timeline } from 'antd';

interface ActivityConditionsProps {
  conditions?: string[];
}

/**
 * 参与条件组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 条件渲染（无条件时不显示）
 * - Timeline 可视化展示
 */
export const ActivityConditions: React.FC<ActivityConditionsProps> = React.memo(
  ({ conditions }) => {
    if (!conditions || conditions.length === 0) return null;

    return (
      <div style={{ marginTop: 24 }}>
        <h3>参与条件</h3>
        <Timeline
          items={conditions.map((condition, index) => ({
            key: index,
            children: condition,
          }))}
        />
      </div>
    );
  }
);

ActivityConditions.displayName = 'ActivityConditions';
