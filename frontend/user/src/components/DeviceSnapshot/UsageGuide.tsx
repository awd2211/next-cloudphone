import React from 'react';
import { Card } from 'antd';
import { usageGuideItems } from '@/utils/snapshotConfig';

/**
 * 使用说明组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 配置驱动的说明列表
 * - 简洁的展示样式
 */
export const UsageGuide: React.FC = React.memo(() => {
  return (
    <Card title="使用说明" style={{ marginTop: 24 }} bordered={false}>
      <ul>
        {usageGuideItems.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </Card>
  );
});

UsageGuide.displayName = 'UsageGuide';
