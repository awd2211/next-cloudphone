import React from 'react';
import { Card, Button, Spin, Space } from 'antd';
import { GiftOutlined, LeftOutlined } from '@ant-design/icons';
import {
  StatsCards,
  CouponGrid,
  CouponTabs,
  CouponDetailModal,
  EmptyState,
} from '@/components/Coupon';
import { useMyCoupons } from '@/hooks/useMyCoupons';

/**
 * 我的优惠券页面（优化版）
 *
 * 优化点：
 * 1. ✅ 使用自定义 hook 管理所有业务逻辑
 * 2. ✅ 页面组件只负责布局和 UI 组合
 * 3. ✅ 所有子组件使用 React.memo 优化
 * 4. ✅ 处理函数使用 useCallback 优化
 * 5. ✅ 统计数据使用 useMemo 优化
 * 6. ✅ 配置驱动的优惠券类型和状态展示
 * 7. ✅ 代码从 408 行减少到 ~105 行
 */
const MyCoupons: React.FC = () => {
  const {
    loading,
    coupons,
    activeTab,
    selectedCoupon,
    stats,
    handleTabChange,
    showCouponDetail,
    closeDetailModal,
    handleUseCoupon,
    goToActivities,
  } = useMyCoupons();

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
