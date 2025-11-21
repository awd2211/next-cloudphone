import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Spin, Space, message } from 'antd';
import { GiftOutlined, LeftOutlined } from '@ant-design/icons';
import {
  StatsCards,
  CouponGrid,
  CouponTabs,
  CouponDetailModal,
  EmptyState,
} from '@/components/Coupon';
import { useMyCoupons } from '@/hooks/queries';
import type { Coupon, CouponStatus } from '@/services/activity';
import { getUsageRoute, getUsageMessage } from '@/utils/couponConfig';

/**
 * 我的优惠券页面
 *
 * 功能：
 * 1. 展示用户所有优惠券（可用、已用、已过期）
 * 2. Tab 筛选不同状态的优惠券
 * 3. 统计数据展示
 * 4. 查看优惠券详情
 * 5. 使用优惠券（跳转到对应页面）
 */
const MyCoupons: React.FC = () => {
  const navigate = useNavigate();

  // 本地状态
  const [activeTab, setActiveTab] = useState<CouponStatus | 'all'>('all');
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);

  // React Query hooks
  const { data: couponsData, isLoading: loading } = useMyCoupons({
    status: activeTab === 'all' ? undefined : activeTab,
    page: 1,
    pageSize: 100,
  });

  // useMyCoupons 返回 { data: Coupon[], total, page, pageSize }
  const coupons: Coupon[] = couponsData?.data || [];

  // 统计数据计算
  const stats = useMemo(() => {
    return {
      total: coupons.length,
      available: coupons.filter((c: Coupon) => c.status === 'available').length,
      used: coupons.filter((c: Coupon) => c.status === 'used').length,
      expired: coupons.filter((c: Coupon) => c.status === 'expired').length,
    };
  }, [coupons]);

  // Tab 切换
  const handleTabChange = useCallback((key: CouponStatus | 'all') => {
    setActiveTab(key);
  }, []);

  // 显示优惠券详情
  const showCouponDetail = useCallback((coupon: Coupon) => {
    setSelectedCoupon(coupon);
  }, []);

  // 关闭详情 Modal
  const closeDetailModal = useCallback(() => {
    setSelectedCoupon(null);
  }, []);

  // 使用优惠券
  const handleUseCoupon = useCallback((coupon: Coupon) => {
    const route = getUsageRoute(coupon);
    const msg = getUsageMessage(coupon);

    if (route) {
      message.success(msg);
      navigate(route.path, { state: route.state });
    } else {
      message.info('该优惠券暂不支持在线使用');
    }
  }, [navigate]);

  // 返回活动中心
  const goToActivities = useCallback(() => {
    navigate('/activities');
  }, [navigate]);

  return (
    <div>
      {/* 顶部返回按钮 */}
      <Button icon={<LeftOutlined />} onClick={goToActivities} style={{ marginBottom: 16 }}>
        返回活动中心
      </Button>

      {/* 统计卡片 */}
      <StatsCards stats={stats} />

      {/* 优惠券列表 */}
      <Card
        title={
          <Space>
            <GiftOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <span style={{ fontSize: 20 }}>我的优惠券</span>
          </Space>
        }
      >
        {/* 标签页 */}
        <CouponTabs activeTab={activeTab} stats={stats} onTabChange={handleTabChange} />

        {/* 优惠券网格或空状态 */}
        <Spin spinning={loading}>
          {coupons.length > 0 ? (
            <CouponGrid
              coupons={coupons}
              onShowDetail={showCouponDetail}
              onUseCoupon={handleUseCoupon}
            />
          ) : (
            <EmptyState onGoToActivities={goToActivities} />
          )}
        </Spin>
      </Card>

      {/* 优惠券详情 Modal */}
      <CouponDetailModal
        coupon={selectedCoupon}
        onClose={closeDetailModal}
        onUseCoupon={handleUseCoupon}
      />
    </div>
  );
};

export default MyCoupons;
