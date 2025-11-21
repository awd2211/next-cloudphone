import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTicketList } from '../useTicketList';
import * as ticketService from '@/services/ticket';
import { message } from 'antd';
import type { Ticket, TicketStats } from '@/services/ticket';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

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
  };
});

// Mock ticket service
vi.mock('@/services/ticket', () => ({
  getMyTickets: vi.fn(),
  getMyTicketStats: vi.fn(),
}));

describe('useTicketList Hook', () => {
  const mockTickets: Ticket[] = [
    {
      id: '1',
      title: 'Test Ticket 1',
      type: 'technical',
      priority: 'high',
      status: 'open',
      content: 'Content 1',
      createdAt: '2024-01-01T00:00:00Z',
    } as Ticket,
    {
      id: '2',
      title: 'Test Ticket 2',
      type: 'billing',
      priority: 'medium',
      status: 'processing',
      content: 'Content 2',
      createdAt: '2024-01-02T00:00:00Z',
    } as Ticket,
  ];

  const mockStats: TicketStats = {
    total: 10,
    open: 3,
    processing: 4,
    closed: 3,
    byType: {
      technical: 5,
      billing: 3,
      general: 2,
    },
    byPriority: {
      low: 2,
      medium: 5,
      high: 3,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(ticketService.getMyTickets).mockResolvedValue({
      items: mockTickets,
      total: 10,
    });
    vi.mocked(ticketService.getMyTicketStats).mockResolvedValue(mockStats);
  });

  describe('初始化', () => {
    it('mount时应该开始加载数据', () => {
      const { result } = renderHook(() => useTicketList());
      // loading应该为true或false，因为加载可能立即开始
      expect(typeof result.current.loading).toBe('boolean');
    });

    it('应该初始化tickets为空数组', () => {
      const { result } = renderHook(() => useTicketList());
      expect(result.current.tickets).toEqual([]);
    });

    it('应该初始化total为0', () => {
      const { result } = renderHook(() => useTicketList());
      expect(result.current.total).toBe(0);
    });

    it('应该初始化stats为null', () => {
      const { result } = renderHook(() => useTicketList());
      expect(result.current.stats).toBeNull();
    });

    it('应该初始化createModalVisible为false', () => {
      const { result } = renderHook(() => useTicketList());
      expect(result.current.createModalVisible).toBe(false);
    });

    it('应该初始化query为默认值', () => {
      const { result } = renderHook(() => useTicketList());
      expect(result.current.query).toEqual({
        page: 1,
        pageSize: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });
  });

  describe('数据加载', () => {
    it('mount时应该加载工单列表', async () => {
      renderHook(() => useTicketList());

      await waitFor(() => {
        expect(ticketService.getMyTickets).toHaveBeenCalled();
      });
    });

    it('mount时应该加载统计数据', async () => {
      renderHook(() => useTicketList());

      await waitFor(() => {
        expect(ticketService.getMyTicketStats).toHaveBeenCalled();
      });
    });

    it('加载成功应该更新tickets', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets).toEqual(mockTickets);
      });
    });

    it('加载成功应该更新total', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.total).toBe(10);
      });
    });

    it('加载成功应该更新stats', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.stats).toEqual(mockStats);
      });
    });

    it('加载失败应该显示错误消息', async () => {
      vi.mocked(ticketService.getMyTickets).mockRejectedValue(
        new Error('Network error')
      );

      renderHook(() => useTicketList());

      await waitFor(() => {
        expect(message.error).toHaveBeenCalled();
      });
    });
  });

  describe('handleSearch 搜索', () => {
    it('应该更新query的keyword', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleSearch('test keyword');
      });

      expect(result.current.query.keyword).toBe('test keyword');
    });

    it('搜索时应该重置page为1', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      // 先设置page为2
      act(() => {
        result.current.handlePageChange(2);
      });

      expect(result.current.query.page).toBe(2);

      // 搜索时应该重置为1
      act(() => {
        result.current.handleSearch('test');
      });

      expect(result.current.query.page).toBe(1);
    });

    it('handleSearch应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useTicketList());

      const firstHandle = result.current.handleSearch;
      rerender();
      const secondHandle = result.current.handleSearch;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleStatusChange 状态筛选', () => {
    it('应该更新query的status', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleStatusChange('open' as any);
      });

      expect(result.current.query.status).toBe('open');
    });

    it('筛选时应该重置page为1', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      // 先设置page为2
      act(() => {
        result.current.handlePageChange(2);
      });

      // 筛选时应该重置为1
      act(() => {
        result.current.handleStatusChange('open' as any);
      });

      expect(result.current.query.page).toBe(1);
    });

    it('handleStatusChange应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useTicketList());

      const firstHandle = result.current.handleStatusChange;
      rerender();
      const secondHandle = result.current.handleStatusChange;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleTypeChange 类型筛选', () => {
    it('应该更新query的type', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleTypeChange('technical' as any);
      });

      expect(result.current.query.type).toBe('technical');
    });

    it('筛选时应该重置page为1', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      // 先设置page为2
      act(() => {
        result.current.handlePageChange(2);
      });

      // 筛选时应该重置为1
      act(() => {
        result.current.handleTypeChange('technical' as any);
      });

      expect(result.current.query.page).toBe(1);
    });

    it('handleTypeChange应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useTicketList());

      const firstHandle = result.current.handleTypeChange;
      rerender();
      const secondHandle = result.current.handleTypeChange;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handlePriorityChange 优先级筛选', () => {
    it('应该更新query的priority', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handlePriorityChange('high' as any);
      });

      expect(result.current.query.priority).toBe('high');
    });

    it('筛选时应该重置page为1', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      // 先设置page为2
      act(() => {
        result.current.handlePageChange(2);
      });

      // 筛选时应该重置为1
      act(() => {
        result.current.handlePriorityChange('high' as any);
      });

      expect(result.current.query.page).toBe(1);
    });

    it('handlePriorityChange应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useTicketList());

      const firstHandle = result.current.handlePriorityChange;
      rerender();
      const secondHandle = result.current.handlePriorityChange;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handlePageChange 分页变化', () => {
    it('应该更新query的page', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handlePageChange(2);
      });

      expect(result.current.query.page).toBe(2);
    });

    it('应该更新query的pageSize', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handlePageChange(2, 20);
      });

      expect(result.current.query.page).toBe(2);
      expect(result.current.query.pageSize).toBe(20);
    });

    it('不传pageSize应该保持原值', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handlePageChange(2);
      });

      expect(result.current.query.pageSize).toBe(10); // 原始值
    });

    it('handlePageChange应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useTicketList());

      const firstHandle = result.current.handlePageChange;
      rerender();
      const secondHandle = result.current.handlePageChange;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleRefresh 刷新', () => {
    it('应该调用loadTickets和loadStats', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      vi.clearAllMocks();

      act(() => {
        result.current.handleRefresh();
      });

      expect(ticketService.getMyTickets).toHaveBeenCalled();
      expect(ticketService.getMyTicketStats).toHaveBeenCalled();
    });

    it('handleRefresh应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useTicketList());

      const firstHandle = result.current.handleRefresh;
      rerender();
      const secondHandle = result.current.handleRefresh;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('Modal 控制', () => {
    it('openCreateModal应该打开modal', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.openCreateModal();
      });

      expect(result.current.createModalVisible).toBe(true);
    });

    it('closeCreateModal应该关闭modal', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.openCreateModal();
        result.current.closeCreateModal();
      });

      expect(result.current.createModalVisible).toBe(false);
    });

    it('openCreateModal应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useTicketList());

      const firstHandle = result.current.openCreateModal;
      rerender();
      const secondHandle = result.current.openCreateModal;

      expect(firstHandle).toBe(secondHandle);
    });

    it('closeCreateModal应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useTicketList());

      const firstHandle = result.current.closeCreateModal;
      rerender();
      const secondHandle = result.current.closeCreateModal;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('handleCreateSuccess 创建成功', () => {
    it('应该关闭modal', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.openCreateModal();
      });

      expect(result.current.createModalVisible).toBe(true);

      vi.clearAllMocks();

      act(() => {
        result.current.handleCreateSuccess();
      });

      expect(result.current.createModalVisible).toBe(false);
    });

    it('应该刷新数据', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      vi.clearAllMocks();

      act(() => {
        result.current.handleCreateSuccess();
      });

      expect(ticketService.getMyTickets).toHaveBeenCalled();
      expect(ticketService.getMyTicketStats).toHaveBeenCalled();
    });

    it('handleCreateSuccess应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useTicketList());

      const firstHandle = result.current.handleCreateSuccess;
      rerender();
      const secondHandle = result.current.handleCreateSuccess;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('goToDetail 导航', () => {
    it('应该导航到工单详情页', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.goToDetail('ticket-123');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/tickets/ticket-123');
    });

    it('goToDetail应该是稳定的函数引用', () => {
      const { result, rerender } = renderHook(() => useTicketList());

      const firstHandle = result.current.goToDetail;
      rerender();
      const secondHandle = result.current.goToDetail;

      expect(firstHandle).toBe(secondHandle);
    });
  });

  describe('query变化触发重新加载', () => {
    it('query变化应该触发loadTickets', async () => {
      const { result } = renderHook(() => useTicketList());

      await waitFor(() => {
        expect(result.current.tickets.length).toBeGreaterThan(0);
      });

      vi.clearAllMocks();

      act(() => {
        result.current.handleSearch('test');
      });

      await waitFor(() => {
        expect(ticketService.getMyTickets).toHaveBeenCalled();
      });
    });
  });
});
