import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExportCenter } from '../useExportCenter';
import * as exportService from '@/services/export';
import { message } from 'antd';
import type { ExportTask } from '@/services/export';

// Mock antd
const mockForm = {
  validateFields: vi.fn(),
  resetFields: vi.fn(),
  setFieldsValue: vi.fn(),
};

vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    Form: {
      useForm: vi.fn(() => [mockForm]),
    },
    message: {
      success: vi.fn(),
      error: vi.fn(),
      loading: vi.fn(),
    },
  };
});

// Mock export service
vi.mock('@/services/export', () => ({
  getExportTasks: vi.fn(),
  getExportStats: vi.fn(),
  createExportTask: vi.fn(),
  deleteExportTask: vi.fn(),
  deleteExportTasks: vi.fn(),
  downloadExportFile: vi.fn(),
  retryExportTask: vi.fn(),
  clearCompletedTasks: vi.fn(),
  clearFailedTasks: vi.fn(),
  triggerDownload: vi.fn(),
  ExportDataType: {},
  ExportStatus: {},
}));

// Mock export table columns
vi.mock('@/utils/exportTableColumns', () => ({
  createExportTableColumns: vi.fn(() => []),
}));

describe('useExportCenter Hook', () => {
  const mockTasks: ExportTask[] = [
    {
      id: '1',
      dataType: 'device',
      format: 'xlsx',
      status: 'completed',
      fileName: 'devices_export.xlsx',
      fileSize: 1024,
      recordCount: 100,
      createdAt: '2024-01-01T00:00:00Z',
    } as ExportTask,
  ];

  const mockStats = {
    total: 10,
    pending: 2,
    processing: 3,
    completed: 4,
    failed: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    vi.mocked(exportService.getExportTasks).mockResolvedValue({
      items: mockTasks,
      total: 10,
    });
    vi.mocked(exportService.getExportStats).mockResolvedValue(mockStats);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('初始化', () => {
    it('应该初始化loading为false', () => {
      const { result } = renderHook(() => useExportCenter());
      expect(result.current.loading).toBe(false);
    });

    it('应该初始化tasks为空数组', () => {
      const { result } = renderHook(() => useExportCenter());
      expect(result.current.tasks).toEqual([]);
    });

    it('应该初始化selectedRowKeys为空数组', () => {
      const { result } = renderHook(() => useExportCenter());
      expect(result.current.selectedRowKeys).toEqual([]);
    });

    it('应该初始化createModalVisible为false', () => {
      const { result } = renderHook(() => useExportCenter());
      expect(result.current.createModalVisible).toBe(false);
    });
  });

  describe('数据加载', () => {
    it('mount时应该加载任务列表', async () => {
      renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(exportService.getExportTasks).toHaveBeenCalled();
      });
    });

    it('mount时应该加载统计数据', async () => {
      renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(exportService.getExportStats).toHaveBeenCalled();
      });
    });

    it('加载成功应该更新tasks', async () => {
      const { result } = renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(result.current.tasks).toEqual(mockTasks);
      });
    });

    it('加载成功应该更新stats', async () => {
      const { result } = renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(result.current.stats).toEqual(mockStats);
      });
    });
  });

  describe('handleOpenCreateModal 打开创建弹窗', () => {
    it('应该打开createModal', async () => {
      const { result } = renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(result.current.tasks.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleOpenCreateModal();
      });

      expect(result.current.createModalVisible).toBe(true);
    });
  });

  describe('handleCloseCreateModal 关闭创建弹窗', () => {
    it('应该关闭createModal', async () => {
      const { result } = renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(result.current.tasks.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleOpenCreateModal();
        result.current.handleCloseCreateModal();
      });

      expect(result.current.createModalVisible).toBe(false);
    });

    it('应该重置表单', async () => {
      const { result } = renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(result.current.tasks.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleOpenCreateModal();
        result.current.handleCloseCreateModal();
      });

      expect(mockForm.resetFields).toHaveBeenCalled();
    });
  });

  describe('handleCreateExport 创建导出任务', () => {
    it('表单验证成功应该调用createExportTask', async () => {
      mockForm.validateFields.mockResolvedValue({
        dataType: 'device',
        format: 'xlsx',
      });
      vi.mocked(exportService.createExportTask).mockResolvedValue({ id: '1' } as any);

      const { result } = renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(result.current.tasks.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.handleCreateExport();
      });

      expect(exportService.createExportTask).toHaveBeenCalled();
    });

    it('创建成功应该显示成功消息', async () => {
      mockForm.validateFields.mockResolvedValue({
        dataType: 'device',
        format: 'xlsx',
      });
      vi.mocked(exportService.createExportTask).mockResolvedValue({ id: '1' } as any);

      const { result } = renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(result.current.tasks.length).toBeGreaterThan(0);
      });

      await act(async () => {
        await result.current.handleCreateExport();
      });

      expect(message.success).toHaveBeenCalledWith('导出任务已创建，正在处理中...');
    });

    it('创建成功应该关闭弹窗', async () => {
      mockForm.validateFields.mockResolvedValue({
        dataType: 'device',
        format: 'xlsx',
      });
      vi.mocked(exportService.createExportTask).mockResolvedValue({ id: '1' } as any);

      const { result } = renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(result.current.tasks.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleOpenCreateModal();
      });

      await act(async () => {
        await result.current.handleCreateExport();
      });

      expect(result.current.createModalVisible).toBe(false);
    });
  });

  describe('handlePageChange 分页变化', () => {
    it('应该更新query', async () => {
      const { result } = renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(result.current.tasks.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handlePageChange(2, 20);
      });

      expect(result.current.query.page).toBe(2);
      expect(result.current.query.pageSize).toBe(20);
    });
  });

  describe('handleStatusChange 状态筛选', () => {
    it('应该更新query并重置page', async () => {
      const { result } = renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(result.current.tasks.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleStatusChange('completed' as any);
      });

      expect(result.current.query.status).toBe('completed');
      expect(result.current.query.page).toBe(1);
    });
  });

  describe('handleDataTypeChange 数据类型筛选', () => {
    it('应该更新query并重置page', async () => {
      const { result } = renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(result.current.tasks.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleDataTypeChange('device' as any);
      });

      expect(result.current.query.dataType).toBe('device');
      expect(result.current.query.page).toBe(1);
    });
  });

  describe('自动刷新', () => {
    it('应该每5秒自动刷新', async () => {
      renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(exportService.getExportTasks).toHaveBeenCalled();
      });

      vi.clearAllMocks();

      // 前进5秒
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(exportService.getExportTasks).toHaveBeenCalled();
      });
    });

    it('unmount时应该清理定时器', async () => {
      const { unmount } = renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(exportService.getExportTasks).toHaveBeenCalled();
      });

      vi.clearAllMocks();

      unmount();

      // 前进5秒
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // 不应该再次调用
      expect(exportService.getExportTasks).not.toHaveBeenCalled();
    });
  });

  describe('handleRefresh 刷新', () => {
    it('应该重新加载任务和统计', async () => {
      const { result } = renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(result.current.tasks.length).toBeGreaterThan(0);
      });

      vi.clearAllMocks();

      act(() => {
        result.current.handleRefresh();
      });

      expect(exportService.getExportTasks).toHaveBeenCalled();
      expect(exportService.getExportStats).toHaveBeenCalled();
    });
  });

  describe('columns 表格列配置', () => {
    it('应该定义columns', async () => {
      const { result } = renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(result.current.tasks.length).toBeGreaterThan(0);
      });

      expect(result.current.columns).toBeDefined();
    });

    it('columns应该使用useMemo缓存', async () => {
      const { result, rerender } = renderHook(() => useExportCenter());

      await waitFor(() => {
        expect(result.current.tasks.length).toBeGreaterThan(0);
      });

      const firstColumns = result.current.columns;
      rerender();
      const secondColumns = result.current.columns;

      expect(firstColumns).toBe(secondColumns);
    });
  });
});
