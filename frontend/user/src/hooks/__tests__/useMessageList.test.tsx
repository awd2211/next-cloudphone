import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMessageList } from '../useMessageList';
import * as notificationService from '@/services/notification';
import { message, Modal } from 'antd';
import type { Notification } from '@/services/notification';

// Mock antd
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    message: {
      success: vi.fn(),
      error: vi.fn(),
      warning: vi.fn(),
    },
    Modal: {
      confirm: vi.fn(),
    },
  };
});

// Mock notification service
vi.mock('@/services/notification', () => ({
  getNotifications: vi.fn(),
  getNotificationStats: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  deleteNotifications: vi.fn(),
  clearReadNotifications: vi.fn(),
}));

describe('useMessageList Hook', () => {
  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'system',
      title: 'Test Notification 1',
      content: 'Content 1',
      isRead: false,
      createdAt: '2024-01-01T00:00:00Z',
    } as Notification,
    {
      id: '2',
      type: 'warning',
      title: 'Test Notification 2',
      content: 'Content 2',
      isRead: true,
      createdAt: '2024-01-02T00:00:00Z',
    } as Notification,
  ];

  const mockStats = {
    total: 10,
    unread: 3,
    read: 7,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(notificationService.getNotifications).mockResolvedValue({
      items: mockNotifications,
      total: 10,
    });
    vi.mocked(notificationService.getNotificationStats).mockResolvedValue(mockStats);
  });

  describe('初始化', () => {
    it('应该初始化loading为false', () => {
      const { result } = renderHook(() => useMessageList());
      expect(result.current.loading).toBe(false);
    });

    it('应该初始化notifications为空数组', () => {
      const { result } = renderHook(() => useMessageList());
      expect(result.current.notifications).toEqual([]);
    });

    it('应该初始化selectedNotifications为空数组', () => {
      const { result } = renderHook(() => useMessageList());
      expect(result.current.selectedNotifications).toEqual([]);
    });

    it('应该初始化detailModalVisible为false', () => {
      const { result } = renderHook(() => useMessageList());
      expect(result.current.detailModalVisible).toBe(false);
    });
  });

  describe('数据加载', () => {
    it('mount时应该加载notifications', async () => {
      renderHook(() => useMessageList());

      await waitFor(() => {
        expect(notificationService.getNotifications).toHaveBeenCalled();
      });
    });

    it('mount时应该加载stats', async () => {
      renderHook(() => useMessageList());

      await waitFor(() => {
        expect(notificationService.getNotificationStats).toHaveBeenCalled();
      });
    });

    it('加载成功应该更新notifications', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications).toEqual(mockNotifications);
      });
    });

    it('加载成功应该更新stats', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.stats).toEqual(mockStats);
      });
    });

    it('加载失败应该显示错误消息', async () => {
      vi.mocked(notificationService.getNotifications).mockRejectedValue(
        new Error('Network error')
      );

      renderHook(() => useMessageList());

      await waitFor(() => {
        expect(message.error).toHaveBeenCalledWith('加载消息列表失败');
      });
    });
  });

  describe('handleSelectAll 全选', () => {
    it('checked=true应该选中所有通知', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSelectAll(true);
      });

      expect(result.current.selectedNotifications).toEqual(['1', '2']);
    });

    it('checked=false应该取消所有选择', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSelectAll(true);
        result.current.handleSelectAll(false);
      });

      expect(result.current.selectedNotifications).toEqual([]);
    });
  });

  describe('handleSelectNotification 选择单个通知', () => {
    it('should添加到selectedNotifications', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSelectNotification('1', true);
      });

      expect(result.current.selectedNotifications).toContain('1');
    });

    it('should从selectedNotifications移除', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSelectNotification('1', true);
        result.current.handleSelectNotification('1', false);
      });

      expect(result.current.selectedNotifications).not.toContain('1');
    });
  });

  describe('selectAllChecked 全选状态', () => {
    it('未选择任何通知时应该为false', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      expect(result.current.selectAllChecked).toBe(false);
    });

    it('选择全部通知时应该为true', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSelectAll(true);
      });

      expect(result.current.selectAllChecked).toBe(true);
    });
  });

  describe('selectAllIndeterminate 半选状态', () => {
    it('未选择时应该为false', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      expect(result.current.selectAllIndeterminate).toBe(false);
    });

    it('选择部分通知时应该为true', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSelectNotification('1', true);
      });

      expect(result.current.selectAllIndeterminate).toBe(true);
    });

    it('选择全部时应该为false', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSelectAll(true);
      });

      expect(result.current.selectAllIndeterminate).toBe(false);
    });
  });

  describe('handleBatchMarkRead 批量标记已读', () => {
    it('未选择通知时应该显示警告', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.handleBatchMarkRead();
      });

      expect(message.warning).toHaveBeenCalledWith('请先选择消息');
    });

    it('选择通知后应该调用markAsRead API', async () => {
      vi.mocked(notificationService.markAsRead).mockResolvedValue(undefined);
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSelectNotification('1', true);
      });

      await act(async () => {
        await result.current.handleBatchMarkRead();
      });

      expect(notificationService.markAsRead).toHaveBeenCalledWith(['1']);
    });

    it('标记成功应该显示成功消息', async () => {
      vi.mocked(notificationService.markAsRead).mockResolvedValue(undefined);
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSelectNotification('1', true);
      });

      await act(async () => {
        await result.current.handleBatchMarkRead();
      });

      expect(message.success).toHaveBeenCalledWith('已标记为已读');
    });
  });

  describe('handleViewDetail 查看详情', () => {
    it('应该设置selectedNotification', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleViewDetail(mockNotifications[0]);
      });

      expect(result.current.selectedNotification).toBe(mockNotifications[0]);
    });

    it('应该打开详情模态框', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleViewDetail(mockNotifications[0]);
      });

      expect(result.current.detailModalVisible).toBe(true);
    });
  });

  describe('handleCloseDetail 关闭详情', () => {
    it('应该关闭详情模态框', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleViewDetail(mockNotifications[0]);
        result.current.handleCloseDetail();
      });

      expect(result.current.detailModalVisible).toBe(false);
    });

    it('应该清空selectedNotification', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleViewDetail(mockNotifications[0]);
        result.current.handleCloseDetail();
      });

      expect(result.current.selectedNotification).toBeNull();
    });
  });

  describe('handlePageChange 分页变化', () => {
    it('应该更新query的page', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handlePageChange(2, 20);
      });

      expect(result.current.query.page).toBe(2);
      expect(result.current.query.pageSize).toBe(20);
    });
  });

  describe('handleFilterChange 筛选变化', () => {
    it('应该更新query并重置page为1', async () => {
      const { result } = renderHook(() => useMessageList());

      await waitFor(() => {
        expect(result.current.notifications.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleFilterChange('type', 'system');
      });

      expect(result.current.query.type).toBe('system');
      expect(result.current.query.page).toBe(1);
    });
  });
});
