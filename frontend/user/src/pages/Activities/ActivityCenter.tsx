import React from 'react';
import { Card, Space, Button } from 'antd';
import { GiftOutlined, RightOutlined } from '@ant-design/icons';
import {
  ActivityBanner,
  StatsCards,
  ActivityTabs,
  ActivityGrid,
} from '@/components/Activity';
import { useActivityCenter } from '@/hooks/useActivityCenter';

/**
 * 活动中心页面（优化版）
 *
 * 优化点：
 * 1. ✅ 使用自定义 hook 管理所有业务逻辑
 * 2. ✅ 页面组件只负责布局和 UI 组合
 * 3. ✅ 所有子组件使用 React.memo 优化
 * 4. ✅ 类型和状态配置提取到配置文件
 * 5. ✅ 工具函数提取到配置文件
 * 6. ✅ 代码从 377 行减少到 ~60 行
 */
const ActivityCenter: React.FC = () => {
  const {
    loading,
    activities,
    stats,
    activeTab,
    handleTabChange,
    goToActivityDetail,
    goToMyCoupons,
  } = useActivityCenter();

  return (
    <div>
      <Card
        title={
          <Space>
            <GiftOutlined style={{ fontSize: 24, color: '#1890ff' }} />
            <span style={{ fontSize: 24, fontWeight: 'bold' }}>活动中心</span>
          </Space>
        }
        extra={
          <Button onClick={goToMyCoupons}>
            我的优惠券 <RightOutlined />
          </Button>
        }
        bordered={false}
      >
        {/* 轮播图 */}
        <ActivityBanner activities={activities} onActivityClick={goToActivityDetail} />

        {/* 统计数据 */}
        <StatsCards stats={stats} />

        {/* Tab切换 */}
        <ActivityTabs activeKey={activeTab} onChange={handleTabChange} />

        {/* 活动列表 */}
        <ActivityGrid
          activities={activities}
          loading={loading}
          onActivityClick={goToActivityDetail}
        />
      </Card>
    </div>
  );
};

export default ActivityCenter;
