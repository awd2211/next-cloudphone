import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { getMyCoupons, type Coupon, CouponStatus } from '@/services/activity';
import { getUsageRoute, getUsageMessage } from '@/utils/couponConfig';

/**
 * 我的优惠券 Hook
 *
 * 优化点:
 * 1. ✅ 提取所有业务逻辑到自定义 hook
 * 2. ✅ 使用 useCallback 优化所有处理函数
 * 3. ✅ 使用 useMemo 优化统计计算
 * 4. ✅ 统一错误处理和消息提示
 * 5. ✅ 集中管理所有状态
 */
export function useMyCoupons() {
  const navigate = useNavigate();

  // ===== 状态管理 =====
  const [loading, setLoading] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [activeTab, setActiveTab] = useState<CouponStatus | 'all'>('all');
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  // ===== 统计数据计算 =====
  /**
   * 计算优惠券统计数据
   */
  const stats = useMemo(() => {
    return {
      total: coupons.length,
      available: coupons.filter((c) => c.status === CouponStatus.AVAILABLE).length,
      used: coupons.filter((c) => c.status === CouponStatus.USED).length,
      expired: coupons.filter((c) => c.status === CouponStatus.EXPIRED).length,
    };
  }, [coupons]);

  // ===== 数据加载 =====
  /**
   * 加载优惠券列表
   */
  const loadCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getMyCoupons({
        status: activeTab === 'all' ? undefined : activeTab,
        page: 1,
        pageSize: 100,
      });
      setCoupons(result.data);
    } catch (error: any) {
      message.error(error.message || '加载优惠券失败');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // ===== 标签切换 =====
  /**
   * 处理标签切换
   */
  const handleTabChange = useCallback((key: CouponStatus | 'all') => {
    setActiveTab(key);
  }, []);

  // ===== 优惠券详情 =====
  /**
   * 显示优惠券详情
   */
  const showCouponDetail = useCallback((coupon: Coupon) => {
    setSelectedCoupon(coupon);
  }, []);

  /**
   * 关闭优惠券详情
   */
  const closeDetailModal = useCallback(() => {
    setSelectedCoupon(null);
  }, []);

  // ===== 使用优惠券 =====
  /**
   * 处理使用优惠券
   */
  const handleUseCoupon = useCallback(
    (coupon: Coupon) => {
      const route = getUsageRoute(coupon);
      const successMessage = getUsageMessage(coupon);

      navigate(route.path, { state: route.state });
      message.success(successMessage);
    },
    [navigate]
  );

  // ===== 导航 =====
  /**
   * 返回活动中心
   */
  const goToActivities = useCallback(() => {
    navigate('/activities');
  }, [navigate]);

  // ===== 副作用 =====
  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  // ===== 返回所有状态和方法 =====
  return {
    // 状态
    loading,
    coupons,
    activeTab,
    selectedCoupon,

    // 统计数据
    stats,

    // 数据操作
    loadCoupons,

    // 标签切换
    handleTabChange,

    // 优惠券详情
    showCouponDetail,
    closeDetailModal,

    // 使用优惠券
    handleUseCoupon,

    // 导航
    goToActivities,
  };
}
