import React from 'react';
import { Tabs } from 'antd';
import { CouponStatus } from '@/services/activity';

const { TabPane } = Tabs;

interface CouponTabsProps {
  activeTab: CouponStatus | 'all';
  stats: {
    total: number;
    available: number;
    used: number;
    expired: number;
  };
  onTabChange: (key: CouponStatus | 'all') => void;
}

/**
 * 优惠券标签页组件
 *
 * 优化点：
 * - 使用 React.memo 优化
 * - 显示每个标签的数量
 */
export const CouponTabs: React.FC<CouponTabsProps> = React.memo(
  ({ activeTab, stats, onTabChange }) => {
    return (
      <Tabs activeKey={activeTab} onChange={(key: any) => onTabChange(key)}>
        <TabPane tab={`全部 (${stats.total})`} key="all" />
        <TabPane tab={`可用 (${stats.available})`} key={CouponStatus.AVAILABLE} />
        <TabPane tab={`已使用 (${stats.used})`} key={CouponStatus.USED} />
        <TabPane tab={`已过期 (${stats.expired})`} key={CouponStatus.EXPIRED} />
      </Tabs>
    );
  }
);

CouponTabs.displayName = 'CouponTabs';
