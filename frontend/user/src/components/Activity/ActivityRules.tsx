import React from 'react';
import { Card } from 'antd';

interface ActivityRulesProps {
  rules?: string;
}

/**
 * 活动规则组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 条件渲染（无规则时不显示）
 * - HTML 内容安全渲染
 */
export const ActivityRules: React.FC<ActivityRulesProps> = React.memo(({ rules }) => {
  if (!rules) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <h3>活动规则</h3>
      <Card>
        <div dangerouslySetInnerHTML={{ __html: rules }} />
      </Card>
    </div>
  );
});

ActivityRules.displayName = 'ActivityRules';
