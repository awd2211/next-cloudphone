/**
 * VirtualList 组件单元测试
 * 测试虚拟滚动列表的核心功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../tests/test-utils';
import VirtualList from '../VirtualList';

// Mock react-window
vi.mock('react-window', () => ({
  List: ({ children, itemCount, itemSize, height, width }: any) => (
    <div
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

// Mock react-virtualized-auto-sizer
vi.mock('react-virtualized-auto-sizer', () => ({
  default: ({ children }: any) => children({ height: 600, width: 800 }),
}));

describe('VirtualList Component', () => {
  // 测试数据
  const mockData = [
    { id: '1', name: 'Item 1', value: 100 },
    { id: '2', name: 'Item 2', value: 200 },
    { id: '3', name: 'Item 3', value: 300 },
    { id: '4', name: 'Item 4', value: 400 },
    { id: '5', name: 'Item 5', value: 500 },
  ];

  // 简单的渲染函数
  const renderItem = (item: typeof mockData[0]) => (
    <div data-testid={`item-${item.id}`}>
      <span>{item.name}</span>
      <span>{item.value}</span>
    </div>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基础渲染', () => {
    it('应该正确渲染虚拟列表', () => {
      render(<VirtualList items={mockData} itemHeight={60} renderItem={renderItem} />);

      const virtualList = screen.getByTestId('virtual-list');
      expect(virtualList).toBeInTheDocument();
    });

    it('应该传递正确的 itemCount', () => {
      render(<VirtualList items={mockData} itemHeight={60} renderItem={renderItem} />);

      const virtualList = screen.getByTestId('virtual-list');
      expect(virtualList).toHaveAttribute('data-item-count', '5');
    });

    it('应该传递正确的 itemSize', () => {
      render(<VirtualList items={mockData} itemHeight={50} renderItem={renderItem} />);

      const virtualList = screen.getByTestId('virtual-list');
      expect(virtualList).toHaveAttribute('data-item-size', '50');
    });

    it('应该使用 AutoSizer 提供的尺寸', () => {
      render(<VirtualList items={mockData} itemHeight={60} renderItem={renderItem} />);

      const virtualList = screen.getByTestId('virtual-list');
      expect(virtualList).toHaveStyle({ height: '600px', width: '800px' });
    });
  });

  describe('列表项渲染', () => {
    it('应该渲染前 3 个可见项', () => {
      render(<VirtualList items={mockData} itemHeight={60} renderItem={renderItem} />);

      // mock 只渲染前 3 个
      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-2')).toBeInTheDocument();
      expect(screen.getByTestId('item-3')).toBeInTheDocument();
    });

    it('应该使用自定义渲染函数', () => {
      const customRender = (item: typeof mockData[0]) => (
        <div data-testid={`custom-${item.id}`}>
          <strong>{item.name.toUpperCase()}</strong>
        </div>
      );

      render(<VirtualList items={mockData} itemHeight={60} renderItem={customRender} />);

      expect(screen.getByTestId('custom-1')).toBeInTheDocument();
      expect(screen.getByText('ITEM 1')).toBeInTheDocument();
    });

    it('应该显示正确的项目内容', () => {
      render(<VirtualList items={mockData} itemHeight={60} renderItem={renderItem} />);

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
    });
  });

  describe('空列表处理', () => {
    it('应该处理空数组', () => {
      render(<VirtualList items={[]} itemHeight={60} renderItem={renderItem} />);

      const virtualList = screen.getByTestId('virtual-list');
      expect(virtualList).toHaveAttribute('data-item-count', '0');
    });

    it('空列表时不应该渲染任何项', () => {
      render(<VirtualList items={[]} itemHeight={60} renderItem={renderItem} />);

      expect(screen.queryByTestId(/item-/)).not.toBeInTheDocument();
    });
  });

  describe('自定义样式', () => {
    it('应该应用自定义 className', () => {
      const { container } = render(
        <VirtualList
          items={mockData}
          itemHeight={60}
          renderItem={renderItem}
          className="custom-list-item"
        />
      );

      // 检查是否有元素应用了 className
      const itemsWithClass = container.querySelectorAll('.custom-list-item');
      expect(itemsWithClass.length).toBeGreaterThan(0);
    });

    it('没有 className 时也应该正常渲染', () => {
      render(<VirtualList items={mockData} itemHeight={60} renderItem={renderItem} />);

      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
    });
  });

  describe('数据更新', () => {
    it('应该响应数据变化', () => {
      const { rerender } = render(
        <VirtualList items={mockData} itemHeight={60} renderItem={renderItem} />
      );

      let virtualList = screen.getByTestId('virtual-list');
      expect(virtualList).toHaveAttribute('data-item-count', '5');

      // 更新数据
      const newData = [...mockData, { id: '6', name: 'Item 6', value: 600 }];
      rerender(<VirtualList items={newData} itemHeight={60} renderItem={renderItem} />);

      virtualList = screen.getByTestId('virtual-list');
      expect(virtualList).toHaveAttribute('data-item-count', '6');
    });

    it('应该响应 itemHeight 变化', () => {
      const { rerender } = render(
        <VirtualList items={mockData} itemHeight={60} renderItem={renderItem} />
      );

      let virtualList = screen.getByTestId('virtual-list');
      expect(virtualList).toHaveAttribute('data-item-size', '60');

      // 更新高度
      rerender(<VirtualList items={mockData} itemHeight={80} renderItem={renderItem} />);

      virtualList = screen.getByTestId('virtual-list');
      expect(virtualList).toHaveAttribute('data-item-size', '80');
    });
  });

  describe('大数据集', () => {
    it('应该处理大量数据', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Item ${i + 1}`,
        value: (i + 1) * 100,
      }));

      render(<VirtualList items={largeDataset} itemHeight={60} renderItem={renderItem} />);

      const virtualList = screen.getByTestId('virtual-list');
      expect(virtualList).toHaveAttribute('data-item-count', '10000');

      // 只渲染前 3 个可见项（虚拟滚动的关键优势）
      const renderedItems = screen.getAllByTestId(/item-/);
      expect(renderedItems).toHaveLength(3);
    });

    it('大数据集应该只渲染可见区域', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `${i + 1}`,
        name: `Item ${i + 1}`,
        value: (i + 1) * 100,
      }));

      render(<VirtualList items={largeDataset} itemHeight={60} renderItem={renderItem} />);

      // 验证只有前 3 个项被渲染
      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-2')).toBeInTheDocument();
      expect(screen.getByTestId('item-3')).toBeInTheDocument();

      // 其他项不应该被渲染
      expect(screen.queryByTestId('item-4')).not.toBeInTheDocument();
      expect(screen.queryByTestId('item-100')).not.toBeInTheDocument();
    });
  });

  describe('渲染函数变化', () => {
    it('应该响应渲染函数变化', () => {
      const { rerender } = render(
        <VirtualList items={mockData} itemHeight={60} renderItem={renderItem} />
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();

      // 使用新的渲染函数
      const newRenderItem = (item: typeof mockData[0]) => (
        <div data-testid={`new-${item.id}`}>
          <em>{item.name}</em>
        </div>
      );

      rerender(<VirtualList items={mockData} itemHeight={60} renderItem={newRenderItem} />);

      expect(screen.getByTestId('new-1')).toBeInTheDocument();
    });
  });

  describe('边界情况', () => {
    it('应该处理只有一个项的列表', () => {
      const singleItem = [{ id: '1', name: 'Single Item', value: 100 }];

      render(<VirtualList items={singleItem} itemHeight={60} renderItem={renderItem} />);

      const virtualList = screen.getByTestId('virtual-list');
      expect(virtualList).toHaveAttribute('data-item-count', '1');
      expect(screen.getByTestId('item-1')).toBeInTheDocument();
    });

    it('应该处理非常小的 itemHeight', () => {
      render(<VirtualList items={mockData} itemHeight={10} renderItem={renderItem} />);

      const virtualList = screen.getByTestId('virtual-list');
      expect(virtualList).toHaveAttribute('data-item-size', '10');
    });

    it('应该处理非常大的 itemHeight', () => {
      render(<VirtualList items={mockData} itemHeight={500} renderItem={renderItem} />);

      const virtualList = screen.getByTestId('virtual-list');
      expect(virtualList).toHaveAttribute('data-item-size', '500');
    });
  });
});
