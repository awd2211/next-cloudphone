import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMyCoupons } from '../useMyCoupons';
import * as activityService from '@/services/activity';
import * as couponConfig from '@/utils/couponConfig';
import { message } from 'antd';

// Mock router
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock activity service
vi.mock('@/services/activity', () => ({
  getMyCoupons: vi.fn(),
  CouponStatus: {
    AVAILABLE: 'available',
    USED: 'used',
    EXPIRED: 'expired',
  },
}));

// Mock coupon config
vi.mock('@/utils/couponConfig', () => ({
  getUsageRoute: vi.fn(),
  getUsageMessage: vi.fn(),
}));

describe('useMyCoupons Hook', () => {
  const mockCoupons = [
    {
      id: 1,
      name: '新用户优惠券',
      type: 'discount',
      value: 85,
      status: 'available',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    },
    {
      id: 2,
      name: '50元代金券',
      type: 'cash',
      value: 50,
      status: 'available',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    },
    {
      id: 3,
      name: '已使用优惠券',
      type: 'discount',
      value: 90,
      status: 'used',
      startDate: '2024-01-01',
      endDate: '2024-06-30',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // 默认 mock
    vi.spyOn(activityService, 'getMyCoupons').mockResolvedValue({
      data: mockCoupons,
      total: mockCoupons.length,
    });
  });

  describe('初始化', () => {
    it('应该有正确的初始状态', async () => {
      const { result } = renderHook(() => useMyCoupons());

      expect(result.current.loading).toBe(true);
      expect(result.current.coupons).toEqual([]);
      expect(result.current.activeTab).toBe('all');
      expect(result.current.selectedCoupon).toBeNull();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('初始化时应该自动加载优惠券', async () => {
      const mockGetMyCoupons = vi.spyOn(activityService, 'getMyCoupons');

      renderHook(() => useMyCoupons());

      await waitFor(() => {
        expect(mockGetMyCoupons).toHaveBeenCalled();
      });
    });

    it('应该提供所有必需的方法', () => {
      const { result } = renderHook(() => useMyCoupons());

      expect(typeof result.current.loadCoupons).toBe('function');
      expect(typeof result.current.handleTabChange).toBe('function');
      expect(typeof result.current.showCouponDetail).toBe('function');
      expect(typeof result.current.closeDetailModal).toBe('function');
      expect(typeof result.current.handleUseCoupon).toBe('function');
      expect(typeof result.current.goToActivities).toBe('function');
    });
  });

  describe('数据加载', () => {
    it('应该成功加载优惠券列表', async () => {
      const { result } = renderHook(() => useMyCoupons());

      await waitFor(() => {
        expect(result.current.coupons).toHaveLength(3);
        expect(result.current.loading).toBe(false);
      });
    });

    it('加载失败时应该显示错误消息', async () => {
      vi.spyOn(activityService, 'getMyCoupons').mockRejectedValue({
        message: '网络错误',
      });

      const { result } = renderHook(() => useMyCoupons());

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('网络错误');
        expect(result.current.loading).toBe(false);
      });
    });

    it('应该能手动刷新优惠券列表', async () => {
      const mockGetMyCoupons = vi.spyOn(activityService, 'getMyCoupons');

      const { result } = renderHook(() => useMyCoupons());

      await waitFor(() => {
        expect(result.current.coupons).toHaveLength(3);
      });

      const initialCallCount = mockGetMyCoupons.mock.calls.length;

      await act(async () => {
        await result.current.loadCoupons();
      });

      expect(mockGetMyCoupons.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe('统计数据', () => {
    it('应该正确计算优惠券统计', async () => {
      const { result } = renderHook(() => useMyCoupons());

      await waitFor(() => {
        expect(result.current.stats).toEqual({
          total: 3,
          available: 2,
          used: 1,
          expired: 0,
        });
      });
    });

    it('统计应该随数据变化而更新', async () => {
      const { result } = renderHook(() => useMyCoupons());

      await waitFor(() => {
        expect(result.current.stats.total).toBe(3);
      });

      // 改变数据
      vi.spyOn(activityService, 'getMyCoupons').mockResolvedValue({
        data: [mockCoupons[0]],
        total: 1,
      });

      await act(async () => {
        await result.current.loadCoupons();
      });

      expect(result.current.stats.total).toBe(1);
      expect(result.current.stats.available).toBe(1);
    });
  });

  describe('Tab切换', () => {
    it('应该能切换到可用优惠券', async () => {
      const { result } = renderHook(() => useMyCoupons());

      await waitFor(() => {
        expect(result.current.coupons).toHaveLength(3);
      });

      act(() => {
        result.current.handleTabChange('available');
      });

      expect(result.current.activeTab).toBe('available');

      await waitFor(() => {
        expect(activityService.getMyCoupons).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'available',
          })
        );
      });
    });

    it('应该能切换到已使用优惠券', async () => {
      const { result } = renderHook(() => useMyCoupons());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleTabChange('used');
      });

      expect(result.current.activeTab).toBe('used');
    });

    it('应该能切换到已过期优惠券', async () => {
      const { result } = renderHook(() => useMyCoupons());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleTabChange('expired');
      });

      expect(result.current.activeTab).toBe('expired');
    });

    it('切换Tab后应该重新加载数据', async () => {
      const mockGetMyCoupons = vi.spyOn(activityService, 'getMyCoupons');

      const { result } = renderHook(() => useMyCoupons());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = mockGetMyCoupons.mock.calls.length;

      act(() => {
        result.current.handleTabChange('available');
      });

      await waitFor(() => {
        expect(mockGetMyCoupons.mock.calls.length).toBeGreaterThan(
          initialCallCount
        );
      });
    });
  });

  describe('优惠券详情', () => {
    it('应该能显示优惠券详情', async () => {
      const { result } = renderHook(() => useMyCoupons());

      await waitFor(() => {
        expect(result.current.coupons).toHaveLength(3);
      });

      act(() => {
        result.current.showCouponDetail(mockCoupons[0]);
      });

      expect(result.current.selectedCoupon).toEqual(mockCoupons[0]);
    });

    it('应该能关闭优惠券详情', async () => {
      const { result } = renderHook(() => useMyCoupons());

      await waitFor(() => {
        expect(result.current.coupons).toHaveLength(3);
      });

      act(() => {
        result.current.showCouponDetail(mockCoupons[0]);
      });

      expect(result.current.selectedCoupon).toBeTruthy();

      act(() => {
        result.current.closeDetailModal();
      });

      expect(result.current.selectedCoupon).toBeNull();
    });
  });

  describe('使用优惠券', () => {
    it('应该能使用优惠券并跳转', async () => {
      vi.spyOn(couponConfig, 'getUsageRoute').mockReturnValue({
        path: '/plans',
        state: { selectedCoupon: 1 },
      });

      vi.spyOn(couponConfig, 'getUsageMessage').mockReturnValue(
        '已选择优惠券，请选择套餐完成购买'
      );

      const { result } = renderHook(() => useMyCoupons());

      await waitFor(() => {
        expect(result.current.coupons).toHaveLength(3);
      });

      act(() => {
        result.current.handleUseCoupon(mockCoupons[0]);
      });

      expect(mockNavigate).toHaveBeenCalledWith('/plans', {
        state: { selectedCoupon: 1 },
      });

      expect(message.success).toHaveBeenCalledWith(
        '已选择优惠券，请选择套餐完成购买'
      );
    });

    it('应该调用配置工具获取路由信息', async () => {
      const mockGetUsageRoute = vi.spyOn(couponConfig, 'getUsageRoute');
      const mockGetUsageMessage = vi.spyOn(couponConfig, 'getUsageMessage');

      mockGetUsageRoute.mockReturnValue({
        path: '/billing/recharge',
        state: { selectedCoupon: 2 },
      });

      mockGetUsageMessage.mockReturnValue('已选择优惠券，请完成充值');

      const { result } = renderHook(() => useMyCoupons());

      await waitFor(() => {
        expect(result.current.coupons).toHaveLength(3);
      });

      act(() => {
        result.current.handleUseCoupon(mockCoupons[1]);
      });

      expect(mockGetUsageRoute).toHaveBeenCalledWith(mockCoupons[1]);
      expect(mockGetUsageMessage).toHaveBeenCalledWith(mockCoupons[1]);
    });
  });

  describe('导航', () => {
    it('应该能返回活动中心', () => {
      const { result } = renderHook(() => useMyCoupons());

      act(() => {
        result.current.goToActivities();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/activities');
    });
  });

  describe('函数稳定性', () => {
    it('handleTabChange应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useMyCoupons());

      const firstRef = result.current.handleTabChange;
      rerender();
      const secondRef = result.current.handleTabChange;

      expect(firstRef).toBe(secondRef);
    });

    it('showCouponDetail应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useMyCoupons());

      const firstRef = result.current.showCouponDetail;
      rerender();
      const secondRef = result.current.showCouponDetail;

      expect(firstRef).toBe(secondRef);
    });

    it('handleUseCoupon应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useMyCoupons());

      const firstRef = result.current.handleUseCoupon;
      rerender();
      const secondRef = result.current.handleUseCoupon;

      expect(firstRef).toBe(secondRef);
    });
  });
});
