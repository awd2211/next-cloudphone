import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Space, Button, Pagination } from 'antd';
import { GiftOutlined, RightOutlined } from '@ant-design/icons';
import {
  ActivityBanner,
  StatsCards,
  ActivityTabs,
  ActivityGrid,
} from '@/components/Activity';
import {
  useActivities,
  useActivityStats,
} from '@/hooks/queries';
import type { ActivityStatus } from '@/services/activity';
import { getListData } from '@/types';

/**
 * 活动中心页面
 *
 * 功能：
 * 1. 展示所有活动（支持按状态筛选）
 * 2. 活动统计数据展示
 * 3. 活动轮播图
 * 4. Tab 切换（全部、进行中、即将开始、已结束）
 * 5. 跳转到活动详情和我的优惠券
 */
const ActivityCenter: React.FC = () => {
  const navigate = useNavigate();

  // 本地状态
  const [activeTab, setActiveTab] = useState<ActivityStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // React Query hooks - 并行查询
  const { data: activitiesData, isLoading: loading } = useActivities({
    status: activeTab === 'all' ? undefined : activeTab,
    page,
    pageSize,
  });
  const { data: stats } = useActivityStats();

  // useActivities 返回 { items/data: Activity[], total, page, pageSize }
  const activities = getListData(activitiesData);
  const total = activitiesData?.total ?? 0;

  // Tab 切换（重置分页）
  const handleTabChange = useCallback((key: ActivityStatus | 'all') => {
    setActiveTab(key);
    setPage(1);
  }, []);

  // 分页变化
  const handlePageChange = useCallback((newPage: number, newPageSize: number) => {
    setPage(newPage);
    setPageSize(newPageSize);
  }, []);

  // 导航函数
  const goToActivityDetail = useCallback(
    (activityId: string) => {
      navigate(`/activities/${activityId}`);
    },
    [navigate]
  );

  const goToMyCoupons = useCallback(() => {
    navigate('/activities/coupons');
  }, [navigate]);

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
        <StatsCards stats={stats ?? null} />

        {/* Tab切换 */}
        <ActivityTabs activeKey={activeTab} onChange={handleTabChange} />

        {/* 活动列表 */}
        <ActivityGrid
          activities={activities}
          loading={loading}
          onActivityClick={goToActivityDetail}
        />

        {/* 分页 */}
        {total > pageSize && (
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              showSizeChanger
              showQuickJumper
              showTotal={(total) => `共 ${total} 个活动`}
              onChange={handlePageChange}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default ActivityCenter;
