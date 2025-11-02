import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import {
  getActivities,
  getActivityStats,
  type Activity,
  ActivityStatus,
} from '@/services/activity';

/**
 * 活动中心 Hook
 *
 * 优化点:
 * 1. ✅ 提取所有业务逻辑到自定义 hook
 * 2. ✅ 使用 useCallback 优化所有处理函数
 * 3. ✅ 统一错误处理和消息提示
 * 4. ✅ 集中管理所有状态
 */
export function useActivityCenter() {
  const navigate = useNavigate();

  // ===== 状态管理 =====
  const [loading, setLoading] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ActivityStatus | 'all'>('all');

  // ===== 数据加载 =====
  /**
   * 加载活动数据和统计信息
   */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [activitiesRes, statsRes] = await Promise.all([
        getActivities({
          status: activeTab === 'all' ? undefined : activeTab,
          page: 1,
          pageSize: 20,
        }),
        getActivityStats(),
      ]);

      setActivities(activitiesRes.data);
      setStats(statsRes);
    } catch (error: any) {
      message.error(error.message || '加载活动失败');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // ===== Tab 切换 =====
  /**
   * 处理 Tab 切换
   */
  const handleTabChange = useCallback((key: ActivityStatus | 'all') => {
    setActiveTab(key);
  }, []);

  // ===== 导航 =====
  /**
   * 跳转到活动详情
   */
  const goToActivityDetail = useCallback(
    (activityId: string) => {
      navigate(`/activities/${activityId}`);
    },
    [navigate]
  );

  /**
   * 跳转到我的优惠券
   */
  const goToMyCoupons = useCallback(() => {
    navigate('/activities/coupons');
  }, [navigate]);

  // ===== 副作用 =====
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===== 返回所有状态和方法 =====
  return {
    // 状态
    loading,
    activities,
    stats,
    activeTab,

    // Tab 切换
    handleTabChange,

    // 导航
    goToActivityDetail,
    goToMyCoupons,
  };
}
