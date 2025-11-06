import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useActivityDetail } from '../useActivityDetail';
import * as activityService from '@/services/activity';
import { ActivityStatus } from '@/services/activity';
import { Modal, message } from 'antd';

// Mock react-router-dom
const mockNavigate = vi.fn();
const mockParams = { id: 'activity-123' };
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}));

// Mock antd - create mocks inline
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    Modal: {
      confirm: vi.fn(),
      success: vi.fn(),
    },
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock activity service
vi.mock('@/services/activity', async () => {
  const actual = await vi.importActual('@/services/activity');
  return {
    ...actual,
    getActivityDetail: vi.fn(),
    participateActivity: vi.fn(),
    claimCoupon: vi.fn(),
  };
});

describe('useActivityDetail Hook', () => {
  const mockActivity = {
    id: 'activity-123',
    title: '春节优惠活动',
    description: '参与活动赢大奖',
    status: ActivityStatus.ONGOING,
    startTime: '2025-01-01',
    endTime: '2025-01-31',
  };

  const mockParticipateResult = {
    message: '参与成功',
    rewards: ['100元优惠券', '积分x1000'],
  };

  const mockCouponResult = {
    coupon: {
      id: 'coupon-1',
      name: '新年优惠券',
      discount: 100,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(activityService.getActivityDetail).mockResolvedValue(mockActivity as any);
    vi.mocked(activityService.participateActivity).mockResolvedValue(mockParticipateResult as any);
    vi.mocked(activityService.claimCoupon).mockResolvedValue(mockCouponResult as any);
  });

  describe('初始化', () => {
    it('应该初始化所有状态', () => {
      const { result } = renderHook(() => useActivityDetail());

      expect(typeof result.current.loading).toBe('boolean');
      expect(typeof result.current.participating).toBe('boolean');
      expect(result.current.activity).toBeNull();
      expect(result.current.hasParticipated).toBe(false);
      expect(typeof result.current.canParticipate).toBe('boolean');
    });
  });

  describe('数据加载', () => {
    it('mount时应该加载活动详情', async () => {
      renderHook(() => useActivityDetail());

      await waitFor(() => {
        expect(activityService.getActivityDetail).toHaveBeenCalledWith('activity-123');
      });
    });

    it('加载成功应该更新activity', async () => {
      const { result } = renderHook(() => useActivityDetail());

      await waitFor(() => {
        expect(result.current.activity).toEqual(mockActivity);
      });
    });

    it('加载失败应该显示错误消息', async () => {
      vi.mocked(activityService.getActivityDetail).mockRejectedValue(
        new Error('网络错误')
      );

      renderHook(() => useActivityDetail());

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('网络错误');
      });
    });

    it('没有id时不应该加载', async () => {
      mockParams.id = '';

      renderHook(() => useActivityDetail());

      await waitFor(() => {
        expect(activityService.getActivityDetail).not.toHaveBeenCalled();
      });

      mockParams.id = 'activity-123'; // 恢复
    });
  });

  describe('handleParticipate 参与活动', () => {
    it('没有activity时不应该执行', async () => {
      const { result } = renderHook(() => useActivityDetail());

      act(() => {
        result.current.handleParticipate();
      });

      expect(Modal.confirm).not.toHaveBeenCalled();
    });

    it('应该显示确认弹窗', async () => {
      const { result } = renderHook(() => useActivityDetail());

      await waitFor(() => {
        expect(result.current.activity).not.toBeNull();
      });

      act(() => {
        result.current.handleParticipate();
      });

      expect(Modal.confirm).toHaveBeenCalled();
      const confirmConfig = vi.mocked(Modal.confirm).mock.calls[0][0];
      expect(confirmConfig.title).toBe('确认参与活动');
      expect(confirmConfig.content).toContain('春节优惠活动');
    });

    it('确认后应该调用参与接口', async () => {
      vi.mocked(Modal.confirm).mockImplementation((config: any) => {
        config.onOk();
        return { destroy: vi.fn() } as any;
      });

      const { result } = renderHook(() => useActivityDetail());

      await waitFor(() => {
        expect(result.current.activity).not.toBeNull();
      });

      act(() => {
        result.current.handleParticipate();
      });

      await waitFor(() => {
        expect(activityService.participateActivity).toHaveBeenCalledWith('activity-123');
      });
    });

    it('参与成功应该显示成功弹窗', async () => {
      vi.mocked(Modal.confirm).mockImplementation((config: any) => {
        config.onOk();
        return { destroy: vi.fn() } as any;
      });

      const { result } = renderHook(() => useActivityDetail());

      await waitFor(() => {
        expect(result.current.activity).not.toBeNull();
      });

      act(() => {
        result.current.handleParticipate();
      });

      await waitFor(() => {
        expect(Modal.success).toHaveBeenCalled();
      });

      const successConfig = vi.mocked(Modal.success).mock.calls[0][0];
      expect(successConfig.title).toBe('参与成功!');
    });

    it('参与成功应该更新hasParticipated状态', async () => {
      vi.mocked(Modal.confirm).mockImplementation((config: any) => {
        config.onOk();
        return { destroy: vi.fn() } as any;
      });

      const { result } = renderHook(() => useActivityDetail());

      await waitFor(() => {
        expect(result.current.activity).not.toBeNull();
      });

      expect(result.current.hasParticipated).toBe(false);

      act(() => {
        result.current.handleParticipate();
      });

      await waitFor(() => {
        expect(result.current.hasParticipated).toBe(true);
      });
    });

    it('参与失败应该显示错误消息', async () => {
      vi.mocked(Modal.confirm).mockImplementation((config: any) => {
        config.onOk();
        return { destroy: vi.fn() } as any;
      });

      vi.mocked(activityService.participateActivity).mockRejectedValue(
        new Error('参与失败')
      );

      const { result } = renderHook(() => useActivityDetail());

      await waitFor(() => {
        expect(result.current.activity).not.toBeNull();
      });

      act(() => {
        result.current.handleParticipate();
      });

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('参与失败');
      });
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useActivityDetail());

      const firstHandle = result.current.handleParticipate;
      rerender();
      const secondHandle = result.current.handleParticipate;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleClaimCoupon 领取优惠券', () => {
    it('没有activity时不应该执行', async () => {
      const { result } = renderHook(() => useActivityDetail());

      await act(async () => {
        await result.current.handleClaimCoupon();
      });

      expect(activityService.claimCoupon).not.toHaveBeenCalled();
    });

    it('领取成功应该显示成功消息', async () => {
      const { result } = renderHook(() => useActivityDetail());

      await waitFor(() => {
        expect(result.current.activity).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleClaimCoupon();
      });

      expect(message.success).toHaveBeenCalledWith('领取成功! 优惠券: 新年优惠券');
    });

    it('领取成功应该更新hasParticipated状态', async () => {
      const { result } = renderHook(() => useActivityDetail());

      await waitFor(() => {
        expect(result.current.activity).not.toBeNull();
      });

      expect(result.current.hasParticipated).toBe(false);

      await act(async () => {
        await result.current.handleClaimCoupon();
      });

      expect(result.current.hasParticipated).toBe(true);
    });

    it('领取失败应该显示错误消息', async () => {
      vi.mocked(activityService.claimCoupon).mockRejectedValue(
        new Error('领取失败')
      );

      const { result } = renderHook(() => useActivityDetail());

      await waitFor(() => {
        expect(result.current.activity).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleClaimCoupon();
      });

      expect(message.error).toHaveBeenCalledWith('领取失败');
    });

    it('应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useActivityDetail());

      const firstHandle = result.current.handleClaimCoupon;
      rerender();
      const secondHandle = result.current.handleClaimCoupon;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('导航', () => {
    it('goBack应该导航到活动列表页', async () => {
      const { result } = renderHook(() => useActivityDetail());

      await waitFor(() => {
        expect(result.current.activity).not.toBeNull();
      });

      act(() => {
        result.current.goBack();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/activities');
    });

    it('goToMyCoupons应该导航到我的优惠券页', async () => {
      const { result } = renderHook(() => useActivityDetail());

      await waitFor(() => {
        expect(result.current.activity).not.toBeNull();
      });

      act(() => {
        result.current.goToMyCoupons();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/activities/coupons');
    });

    it('导航函数应该是稳定的引用', () => {
      const { result, rerender } = renderHook(() => useActivityDetail());

      const firstGoBack = result.current.goBack;
      const firstGoToMyCoupons = result.current.goToMyCoupons;

      rerender();

      expect(result.current.goBack).toBe(firstGoBack);
      expect(result.current.goToMyCoupons).toBe(firstGoToMyCoupons);
    });
  });

  describe('canParticipate 计算属性', () => {
    it('活动进行中且未参与时应该为true', async () => {
      const { result } = renderHook(() => useActivityDetail());

      await waitFor(() => {
        expect(result.current.activity).not.toBeNull();
      });

      expect(result.current.canParticipate).toBe(true);
    });

    it('已参与后应该为false', async () => {
      const { result } = renderHook(() => useActivityDetail());

      await waitFor(() => {
        expect(result.current.activity).not.toBeNull();
      });

      await act(async () => {
        await result.current.handleClaimCoupon();
      });

      expect(result.current.canParticipate).toBe(false);
    });

    it('活动未进行时应该为false', async () => {
      vi.mocked(activityService.getActivityDetail).mockResolvedValue({
        ...mockActivity,
        status: ActivityStatus.ENDED,
      } as any);

      const { result } = renderHook(() => useActivityDetail());

      await waitFor(() => {
        expect(result.current.activity).not.toBeNull();
      });

      expect(result.current.canParticipate).toBe(false);
    });
  });
});
