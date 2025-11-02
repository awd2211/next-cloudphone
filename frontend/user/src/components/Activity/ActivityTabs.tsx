import React from 'react';
import { Tabs } from 'antd';
import { activityTabsConfig } from '@/utils/activityConfig';
import { ActivityStatus } from '@/services/activity';

const { TabPane } = Tabs;

interface ActivityTabsProps {
  activeKey: ActivityStatus | 'all';
  onChange: (key: ActivityStatus | 'all') => void;
}

/**
 * 活动 Tab 组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 配置驱动的 Tab 生成
 */
export const ActivityTabs: React.FC<ActivityTabsProps> = React.memo(
  ({ activeKey, onChange }) => {
    return (
      <Tabs activeKey={activeKey} onChange={(key: any) => onChange(key)}>
        {activityTabsConfig.map((tab) => (
          <TabPane tab={tab.label} key={tab.key} />
        ))}
      </Tabs>
    );
  }
);

ActivityTabs.displayName = 'ActivityTabs';
