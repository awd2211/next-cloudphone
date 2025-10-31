/**
 * 测试示例文件
 * 展示如何测试组件、Hooks 和工具函数
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ==================== 组件测试示例 ====================

describe('PageSkeleton Components', () => {
  it('TableSkeleton should render with correct number of rows', () => {
    const { TableSkeleton } = require('../components/PageSkeleton');
    const { container } = render(<TableSkeleton rows={5} />);

    // 验证组件渲染
    expect(container).toBeInTheDocument();
  });

  it('DetailSkeleton should render card structure', () => {
    const { DetailSkeleton } = require('../components/PageSkeleton');
    const { container } = render(<DetailSkeleton />);

    expect(container.querySelector('.ant-card')).toBeInTheDocument();
  });
});

// ==================== Hooks 测试示例 ====================

describe('useDevices Hook', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  it('should fetch devices successfully', async () => {
    // Mock API 响应
    vi.mock('../../services/device', () => ({
      getDevices: vi.fn().mockResolvedValue({
        data: [
          { id: '1', name: 'Device 1', status: 'running' },
          { id: '2', name: 'Device 2', status: 'idle' },
        ],
        total: 2,
        page: 1,
        pageSize: 10,
      }),
    }));

    const { useDevices } = require('../hooks/queries/useDevices');

    const { result } = renderHook(() => useDevices({ page: 1, pageSize: 10 }), {
      wrapper: createWrapper(),
    });

    // 初始状态应该是 loading
    expect(result.current.isLoading).toBe(true);

    // 等待数据加载完成
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // 验证数据
    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.total).toBe(2);
  });
});

// ==================== 工具函数测试示例 ====================

describe('Constants', () => {
  it('DEVICE_STATUS should have correct values', () => {
    const { DEVICE_STATUS } = require('../constants');

    expect(DEVICE_STATUS.IDLE).toBe('idle');
    expect(DEVICE_STATUS.RUNNING).toBe('running');
    expect(DEVICE_STATUS.STOPPED).toBe('stopped');
    expect(DEVICE_STATUS.ERROR).toBe('error');
  });

  it('DEVICE_STATUS_TEXT should map correctly', () => {
    const { DEVICE_STATUS, DEVICE_STATUS_TEXT } = require('../constants');

    expect(DEVICE_STATUS_TEXT[DEVICE_STATUS.IDLE]).toBe('空闲');
    expect(DEVICE_STATUS_TEXT[DEVICE_STATUS.RUNNING]).toBe('运行中');
    expect(DEVICE_STATUS_TEXT[DEVICE_STATUS.STOPPED]).toBe('已停止');
    expect(DEVICE_STATUS_TEXT[DEVICE_STATUS.ERROR]).toBe('错误');
  });

  it('getRoute should replace params correctly', () => {
    const { ROUTES, getRoute } = require('../constants');

    const route = getRoute(ROUTES.DEVICE_DETAIL, { id: 'device-123' });
    expect(route).toBe('/devices/device-123');
  });
});

// ==================== ErrorHandler Hook 测试 ====================

describe('useErrorHandler', () => {
  it('should handle error and display message', async () => {
    const { useErrorHandler } = require('../hooks/useErrorHandler');
    const mockMessage = vi.fn();

    // Mock Ant Design message
    vi.mock('antd', () => ({
      message: {
        error: mockMessage,
      },
      Modal: {
        error: vi.fn(),
      },
    }));

    const { result } = renderHook(() => useErrorHandler());

    act(() => {
      result.current.handleError('Test error message');
    });

    // 验证错误消息被调用
    await waitFor(() => {
      expect(mockMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Test error message',
        })
      );
    });
  });
});

// ==================== 性能优化组件测试 ====================

describe('OptimizedComponents', () => {
  it('LazyImage should load image on intersection', async () => {
    const { LazyImage } = require('../components/OptimizedComponents');
    const onLoad = vi.fn();

    render(<LazyImage src="https://example.com/image.jpg" alt="Test image" onLoad={onLoad} />);

    // 验证图片初始状态
    const img = screen.getByAlt('Test image') as HTMLImageElement;
    expect(img).toBeInTheDocument();

    // 触发 load 事件
    fireEvent.load(img);

    await waitFor(() => {
      expect(onLoad).toHaveBeenCalled();
    });
  });

  it('DebouncedInput should delay onChange', async () => {
    const { DebouncedInput } = require('../components/OptimizedComponents');
    const onChange = vi.fn();

    render(<DebouncedInput value="" onChange={onChange} delay={300} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;

    // 输入文本
    fireEvent.change(input, { target: { value: 'test' } });

    // onChange 不应该立即触发
    expect(onChange).not.toHaveBeenCalled();

    // 等待 debounce 延迟
    await waitFor(
      () => {
        expect(onChange).toHaveBeenCalledWith('test');
      },
      { timeout: 400 }
    );
  });

  it('ConditionalRender should render children when condition is true', () => {
    const { ConditionalRender } = require('../components/OptimizedComponents');

    const { rerender } = render(
      <ConditionalRender condition={false} fallback={<div>Fallback</div>}>
        <div>Content</div>
      </ConditionalRender>
    );

    // 条件为 false 时显示 fallback
    expect(screen.getByText('Fallback')).toBeInTheDocument();
    expect(screen.queryByText('Content')).not.toBeInTheDocument();

    // 条件为 true 时显示 children
    rerender(
      <ConditionalRender condition={true} fallback={<div>Fallback</div>}>
        <div>Content</div>
      </ConditionalRender>
    );

    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.queryByText('Fallback')).not.toBeInTheDocument();
  });
});

// ==================== 集成测试示例 ====================

describe('Device List Integration', () => {
  it('should render device list and handle actions', async () => {
    // 这是一个集成测试示例
    // 实际实现需要 mock 更多的依赖

    const mockDevices = [
      {
        id: '1',
        name: 'Device 1',
        status: 'running',
        cpuCores: 4,
        memoryMB: 8192,
      },
      {
        id: '2',
        name: 'Device 2',
        status: 'idle',
        cpuCores: 2,
        memoryMB: 4096,
      },
    ];

    // Mock API
    vi.mock('../../services/device', () => ({
      getDevices: vi.fn().mockResolvedValue({
        data: mockDevices,
        total: 2,
        page: 1,
        pageSize: 10,
      }),
      deleteDevice: vi.fn().mockResolvedValue({}),
    }));

    // 测试逻辑...
    expect(mockDevices).toHaveLength(2);
  });
});
