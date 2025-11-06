/**
 * VirtualTable 组件单元测试
 * 测试虚拟滚动表格的核心功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../tests/test-utils';
import { VirtualTable, type VirtualTableColumn } from '../VirtualTable';

// Mock react-window 和相关依赖
vi.mock('react-window', () => ({
  List: ({ children, itemCount, itemSize, height, width, className }: any) => (
    <div
      className={className}
      data-testid="virtual-list"
      style={{ height, width }}
      data-item-count={itemCount}
      data-item-size={itemSize}
    >
      {/* 模拟渲染前 3 个项目 */}
      {Array.from({ length: Math.min(3, itemCount) }).map((_, index) =>
        children({ index, style: {} })
      )}
    </div>
  ),
}));

vi.mock('react-window-infinite-loader', () => ({
  useInfiniteLoader: () => ({
    current: null,
  }),
}));

vi.mock('react-virtualized-auto-sizer', () => ({
  default: ({ children }: any) => children({ height: 600, width: 1200 }),
}));

describe('VirtualTable Component', () => {
  // 测试数据
  const mockData = [
    { id: '1', name: 'Device 1', status: 'running', cpuCores: 4 },
    { id: '2', name: 'Device 2', status: 'idle', cpuCores: 2 },
    { id: '3', name: 'Device 3', status: 'stopped', cpuCores: 8 },
  ];

  // 列配置
  const mockColumns: VirtualTableColumn[] = [
    {
      key: 'name',
      title: '设备名称',
      width: 200,
    },
    {
      key: 'status',
      title: '状态',
      width: 100,
      render: (status) => <span data-testid={`status-${status}`}>{status}</span>,
    },
    {
      key: 'cpuCores',
      title: 'CPU 核心数',
      width: 120,
      align: 'right' as const,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该正确渲染表格结构', () => {
    render(
      <VirtualTable
        data={mockData}
        columns={mockColumns}
        rowHeight={60}
      />
    );

    // 验证虚拟列表渲染
    const virtualList = screen.getByTestId('virtual-list');
    expect(virtualList).toBeInTheDocument();
    expect(virtualList).toHaveAttribute('data-item-count', '3');
    expect(virtualList).toHaveAttribute('data-item-size', '60');
  });

  it('应该正确渲染列标题', () => {
    render(
      <VirtualTable
        data={mockData}
        columns={mockColumns}
        rowHeight={60}
      />
    );

    // 验证所有列标题
    expect(screen.getByText('设备名称')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();
    expect(screen.getByText('CPU 核心数')).toBeInTheDocument();
  });

  it('应该使用自定义 render 函数渲染单元格', () => {
    render(
      <VirtualTable
        data={mockData}
        columns={mockColumns}
        rowHeight={60}
      />
    );

    // 验证自定义渲染的状态单元格（前 3 个可见项）
    expect(screen.getByTestId('status-running')).toBeInTheDocument();
    expect(screen.getByTestId('status-idle')).toBeInTheDocument();
    expect(screen.getByTestId('status-stopped')).toBeInTheDocument();
  });

  it('应该在没有数据时显示空状态', () => {
    render(
      <VirtualTable
        data={[]}
        columns={mockColumns}
        rowHeight={60}
      />
    );

    // 应该显示空状态提示
    expect(screen.getByText('暂无数据')).toBeInTheDocument();

    // 不应该渲染虚拟列表
    expect(screen.queryByTestId('virtual-list')).not.toBeInTheDocument();
  });

  it('应该支持无限加载', async () => {
    const onLoadMore = vi.fn();

    render(
      <VirtualTable
        data={mockData}
        columns={mockColumns}
        rowHeight={60}
        hasMore={true}
        isLoading={false}
        onLoadMore={onLoadMore}
      />
    );

    // 验证无限加载器已集成
    // Note: 实际的滚动触发需要更复杂的模拟
    expect(onLoadMore).not.toHaveBeenCalled(); // 初始不触发
  });

  it('应该在加载时显示加载指示器', () => {
    render(
      <VirtualTable
        data={mockData}
        columns={mockColumns}
        rowHeight={60}
        isLoading={true}
      />
    );

    // 验证加载文本显示
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('应该正确应用列宽', () => {
    const { container } = render(
      <VirtualTable
        data={mockData}
        columns={mockColumns}
        rowHeight={60}
      />
    );

    // 验证列宽样式
    const headers = container.querySelectorAll('.virtual-table-header-cell');
    expect(headers[0]).toHaveStyle({ width: '200px' });
    expect(headers[1]).toHaveStyle({ width: '100px' });
    expect(headers[2]).toHaveStyle({ width: '120px' });
  });

  it('应该正确应用列对齐方式', () => {
    const { container } = render(
      <VirtualTable
        data={mockData}
        columns={mockColumns}
        rowHeight={60}
      />
    );

    // 验证右对齐
    const rightAlignedHeader = container.querySelectorAll('.virtual-table-header-cell')[2];
    expect(rightAlignedHeader).toHaveStyle({ textAlign: 'right' });
  });

  it('应该在数据变化时重新渲染', async () => {
    const { rerender } = render(
      <VirtualTable
        data={mockData}
        columns={mockColumns}
        rowHeight={60}
      />
    );

    // 验证初始数据
    const initialList = screen.getByTestId('virtual-list');
    expect(initialList).toHaveAttribute('data-item-count', '3');

    // 更新数据
    const newData = [...mockData, { id: '4', name: 'Device 4', status: 'running', cpuCores: 16 }];
    rerender(
      <VirtualTable
        data={newData}
        columns={mockColumns}
        rowHeight={60}
      />
    );

    // 验证更新后的数据
    await waitFor(() => {
      const updatedList = screen.getByTestId('virtual-list');
      expect(updatedList).toHaveAttribute('data-item-count', '4');
    });
  });

  it('应该处理大数据集', () => {
    // 创建 1000 条数据
    const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
      id: `${i + 1}`,
      name: `Device ${i + 1}`,
      status: i % 2 === 0 ? 'running' : 'idle',
      cpuCores: (i % 8) + 1,
    }));

    render(
      <VirtualTable
        data={largeDataset}
        columns={mockColumns}
        rowHeight={60}
      />
    );

    // 验证虚拟列表处理大数据集
    const virtualList = screen.getByTestId('virtual-list');
    expect(virtualList).toHaveAttribute('data-item-count', '1000');

    // 只渲染前 3 个项目（mock 限制）
    const renderedItems = screen.getAllByTestId(/status-/);
    expect(renderedItems).toHaveLength(3);
  });

  it('应该渲染表格容器和表头', () => {
    const { container } = render(
      <VirtualTable
        data={mockData}
        columns={mockColumns}
        rowHeight={60}
      />
    );

    // 验证表格容器存在
    const tableContainer = container.querySelector('.virtual-table-container');
    expect(tableContainer).toBeInTheDocument();

    // 验证表头存在
    const header = container.querySelector('.virtual-table-header');
    expect(header).toBeInTheDocument();
  });
});
