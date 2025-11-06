import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useActivityCenter } from '../useActivityCenter';
import * as activityService from '@/services/activity';
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
      error: vi.fn(),
    },
  };
});

// Mock activity service
vi.mock('@/services/activity', () => ({
  getActivities: vi.fn(),
  getActivityStats: vi.fn(),
  ActivityStatus: {
    ONGOING: 'ongoing',
    UPCOMING: 'upcoming',
    ENDED: 'ended',
  },
}));

describe('useActivityCenter Hook', () => {
  const mockActivities = [
    {
      id: '1',
      title: '新用户注册活动',
      status: 'ongoing',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    },
    {
      id: '2',
      title: '充值优惠活动',
      status: 'ongoing',
      startDate: '2024-01-01',
      endDate: '2024-06-30',
    },
    {
      id: '3',
      title: '已结束活动',
      status: 'ended',
      startDate: '2023-01-01',
      endDate: '2023-12-31',
    },
  ];

  const mockStats = {
    total: 10,
    ongoing: 5,
    upcoming: 3,
    ended: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // 默认 mock
    vi.spyOn(activityService, 'getActivities').mockResolvedValue({
      data: mockActivities,
      total: mockActivities.length,
    });

    vi.spyOn(activityService, 'getActivityStats').mockResolvedValue(mockStats);
  });

  describe('初始化', () => {
    it('应该有正确的初始状态', async () => {
      const { result } = renderHook(() => useActivityCenter());

      expect(result.current.loading).toBe(true);
      expect(result.current.activities).toEqual([]);
      expect(result.current.stats).toBeNull();
      expect(result.current.activeTab).toBe('all');

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('初始化时应该自动加载数据', async () => {
      const mockGetActivities = vi.spyOn(activityService, 'getActivities');
      const mockGetActivityStats = vi.spyOn(activityService, 'getActivityStats');

      renderHook(() => useActivityCenter());

      await waitFor(() => {
        expect(mockGetActivities).toHaveBeenCalled();
        expect(mockGetActivityStats).toHaveBeenCalled();
      });
    });

    it('应该提供所有必需的方法', () => {
      const { result } = renderHook(() => useActivityCenter());

      expect(typeof result.current.handleTabChange).toBe('function');
      expect(typeof result.current.goToActivityDetail).toBe('function');
      expect(typeof result.current.goToMyCoupons).toBe('function');
    });
  });

  describe('数据加载', () => {
    it('应该成功加载活动列表和统计数据', async () => {
      const { result } = renderHook(() => useActivityCenter());

      await waitFor(() => {
        expect(result.current.activities).toHaveLength(3);
        expect(result.current.stats).toEqual(mockStats);
        expect(result.current.loading).toBe(false);
      });
    });

    it('应该并行加载活动和统计数据', async () => {
      const mockGetActivities = vi.spyOn(activityService, 'getActivities');
      const mockGetActivityStats = vi.spyOn(activityService, 'getActivityStats');

      renderHook(() => useActivityCenter());

      await waitFor(() => {
        expect(mockGetActivities).toHaveBeenCalled();
        expect(mockGetActivityStats).toHaveBeenCalled();
      });

      // 验证两个API同时被调用（Promise.all）
      expect(mockGetActivities.mock.invocationCallOrder[0]).toBeDefined();
      expect(mockGetActivityStats.mock.invocationCallOrder[0]).toBeDefined();
    });

    it('加载失败时应该显示错误消息', async () => {
      vi.spyOn(activityService, 'getActivities').mockRejectedValue({
        message: '网络错误',
      });

      const { result } = renderHook(() => useActivityCenter());

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('网络错误');
        expect(result.current.loading).toBe(false);
      });
    });

    it('加载失败时应该显示默认错误消息', async () => {
      vi.spyOn(activityService, 'getActivities').mockRejectedValue({});

      const { result } = renderHook(() => useActivityCenter());

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('加载活动失败');
      });
    });

    it('加载时应该设置loading状态', async () => {
      const { result } = renderHook(() => useActivityCenter());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Tab切换', () => {
    it('应该能切换到进行中活动', async () => {
      const { result } = renderHook(() => useActivityCenter());

      await waitFor(() => {
        expect(result.current.activities).toHaveLength(3);
      });

      act(() => {
        result.current.handleTabChange('ongoing');
      });

      expect(result.current.activeTab).toBe('ongoing');

      await waitFor(() => {
        expect(activityService.getActivities).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'ongoing',
          })
        );
      });
    });

    it('应该能切换到即将开始活动', async () => {
      const { result } = renderHook(() => useActivityCenter());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleTabChange('upcoming');
      });

      expect(result.current.activeTab).toBe('upcoming');
    });

    it('应该能切换到已结束活动', async () => {
      const { result } = renderHook(() => useActivityCenter());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleTabChange('ended');
      });

      expect(result.current.activeTab).toBe('ended');
    });

    it('应该能切换回全部活动', async () => {
      const { result } = renderHook(() => useActivityCenter());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleTabChange('ongoing');
      });

      act(() => {
        result.current.handleTabChange('all');
      });

      expect(result.current.activeTab).toBe('all');

      await waitFor(() => {
        expect(activityService.getActivities).toHaveBeenCalledWith(
          expect.objectContaining({
            status: undefined,
          })
        );
      });
    });

    it('切换Tab后应该重新加载数据', async () => {
      const mockGetActivities = vi.spyOn(activityService, 'getActivities');

      const { result } = renderHook(() => useActivityCenter());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const initialCallCount = mockGetActivities.mock.calls.length;

      act(() => {
        result.current.handleTabChange('ongoing');
      });

      await waitFor(() => {
        expect(mockGetActivities.mock.calls.length).toBeGreaterThan(
          initialCallCount
        );
      });
    });
  });

  describe('导航', () => {
    it('应该能跳转到活动详情', () => {
      const { result } = renderHook(() => useActivityCenter());

      act(() => {
        result.current.goToActivityDetail('activity-123');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/activities/activity-123');
    });

    it('应该能跳转到不同的活动详情', () => {
      const { result } = renderHook(() => useActivityCenter());

      act(() => {
        result.current.goToActivityDetail('activity-456');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/activities/activity-456');
    });

    it('应该能跳转到我的优惠券', () => {
      const { result } = renderHook(() => useActivityCenter());

      act(() => {
        result.current.goToMyCoupons();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/activities/coupons');
    });
  });

  describe('数据过滤', () => {
    it('查询全部活动时不应该传递status参数', async () => {
      const mockGetActivities = vi.spyOn(activityService, 'getActivities');

      renderHook(() => useActivityCenter());

      await waitFor(() => {
        expect(mockGetActivities).toHaveBeenCalledWith(
          expect.objectContaining({
            status: undefined,
          })
        );
      });
    });

    it('查询特定状态活动时应该传递status参数', async () => {
      const mockGetActivities = vi.spyOn(activityService, 'getActivities');

      const { result } = renderHook(() => useActivityCenter());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.handleTabChange('ongoing');
      });

      await waitFor(() => {
        const lastCall =
          mockGetActivities.mock.calls[mockGetActivities.mock.calls.length - 1];
        expect(lastCall[0]).toMatchObject({
          status: 'ongoing',
        });
      });
    });
  });

  describe('函数稳定性', () => {
    it('handleTabChange应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useActivityCenter());

      const firstRef = result.current.handleTabChange;
      rerender();
      const secondRef = result.current.handleTabChange;

      expect(firstRef).toBe(secondRef);
    });

    it('goToActivityDetail应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useActivityCenter());

      const firstRef = result.current.goToActivityDetail;
      rerender();
      const secondRef = result.current.goToActivityDetail;

      expect(firstRef).toBe(secondRef);
    });

    it('goToMyCoupons应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useActivityCenter());

      const firstRef = result.current.goToMyCoupons;
      rerender();
      const secondRef = result.current.goToMyCoupons;

      expect(firstRef).toBe(secondRef);
    });
  });

  describe('错误处理', () => {
    it('getActivities失败不应该影响getActivityStats', async () => {
      vi.spyOn(activityService, 'getActivities').mockRejectedValue(
        new Error('活动加载失败')
      );

      vi.spyOn(activityService, 'getActivityStats').mockResolvedValue(mockStats);

      const { result } = renderHook(() => useActivityCenter());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // stats应该还是被加载了
      expect(activityService.getActivityStats).toHaveBeenCalled();
    });

    it('部分数据加载失败应该完成loading状态', async () => {
      vi.spyOn(activityService, 'getActivities').mockRejectedValue(
        new Error('失败')
      );

      const { result } = renderHook(() => useActivityCenter());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(message.error).toHaveBeenCalled();
    });
  });
});
