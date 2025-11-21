/**
 * OptimizedComponents 组件单元测试
 * 测试性能优化组件的功能
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '../../tests/test-utils';
import {
  OptimizedList,
  LazyImage,
  DebouncedInput,
  ConditionalRender,
  ThrottledScrollContainer,
  InfiniteScroll,
  DelayedRender,
  VisibilityToggle,
  BatchSelect,
} from '../OptimizedComponents';

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(private callback: IntersectionObserverCallback) {}
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

describe('OptimizedComponents', () => {
  beforeEach(() => {
    // @ts-ignore
    global.IntersectionObserver = MockIntersectionObserver;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('OptimizedList', () => {
    const mockItems = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' },
    ];

    const renderItem = (item: typeof mockItems[0]) => <div>{item.name}</div>;
    const keyExtractor = (item: typeof mockItems[0]) => item.id;

    it('应该渲染列表项', () => {
      render(
        <OptimizedList items={mockItems} renderItem={renderItem} keyExtractor={keyExtractor} />
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('应该在加载时显示加载文本', () => {
      render(
        <OptimizedList
          items={mockItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          loading={true}
        />
      );

      expect(screen.getByText('加载中...')).toBeInTheDocument();
      expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
    });

    it('应该在空数组时显示空状态', () => {
      render(<OptimizedList items={[]} renderItem={renderItem} keyExtractor={keyExtractor} />);

      expect(screen.getByText('暂无数据')).toBeInTheDocument();
    });

    it('应该显示自定义空状态文本', () => {
      render(
        <OptimizedList
          items={[]}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          emptyText="没有找到任何数据"
        />
      );

      expect(screen.getByText('没有找到任何数据')).toBeInTheDocument();
    });

    it('应该应用自定义 className', () => {
      const { container } = render(
        <OptimizedList
          items={mockItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          className="custom-list"
        />
      );

      expect(container.querySelector('.custom-list')).toBeInTheDocument();
    });
  });

  describe('LazyImage', () => {
    it('应该渲染图片', () => {
      render(<LazyImage src="https://example.com/image.jpg" alt="Test Image" />);

      const img = screen.getByAltText('Test Image');
      expect(img).toBeInTheDocument();
    });

    it('应该初始显示占位符', () => {
      render(<LazyImage src="https://example.com/image.jpg" alt="Test Image" />);

      const img = screen.getByAltText('Test Image') as HTMLImageElement;
      // 初始应该是占位符（SVG data URL）
      expect(img.src).toContain('data:image/svg+xml');
    });

    it('应该调用 onLoad 回调', () => {
      const onLoad = vi.fn();
      render(<LazyImage src="https://example.com/image.jpg" alt="Test Image" onLoad={onLoad} />);

      const img = screen.getByAltText('Test Image');
      fireEvent.load(img);

      expect(onLoad).toHaveBeenCalledTimes(1);
    });

    it('应该在错误时调用 onError', () => {
      const onError = vi.fn();
      render(
        <LazyImage src="https://example.com/image.jpg" alt="Test Image" onError={onError} />
      );

      const img = screen.getByAltText('Test Image');
      fireEvent.error(img);

      expect(onError).toHaveBeenCalledTimes(1);
    });

    it('应该使用自定义占位符', () => {
      const customPlaceholder = 'https://example.com/placeholder.jpg';
      render(
        <LazyImage
          src="https://example.com/image.jpg"
          alt="Test Image"
          placeholder={customPlaceholder}
        />
      );

      const img = screen.getByAltText('Test Image') as HTMLImageElement;
      expect(img.src).toBe(customPlaceholder);
    });
  });

  describe('DebouncedInput', () => {
    it('应该渲染输入框', () => {
      const onChange = vi.fn();
      render(<DebouncedInput value="" onChange={onChange} />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('应该显示初始值', () => {
      const onChange = vi.fn();
      render(<DebouncedInput value="initial value" onChange={onChange} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('initial value');
    });

    it('应该延迟调用 onChange', () => {
      const onChange = vi.fn();
      render(<DebouncedInput value="" onChange={onChange} delay={300} />);

      const input = screen.getByRole('textbox');

      // 输入文本
      fireEvent.change(input, { target: { value: 'test' } });

      // onChange 不应该立即被调用
      expect(onChange).not.toHaveBeenCalled();

      // 快进时间
      vi.advanceTimersByTime(300);

      // 现在应该被调用
      expect(onChange).toHaveBeenCalledWith('test');
    });

    it('应该在延迟时间内只调用一次 onChange', () => {
      const onChange = vi.fn();
      render(<DebouncedInput value="" onChange={onChange} delay={500} />);

      const input = screen.getByRole('textbox');

      // 快速输入多次
      fireEvent.change(input, { target: { value: 'a' } });
      vi.advanceTimersByTime(100);
      fireEvent.change(input, { target: { value: 'ab' } });
      vi.advanceTimersByTime(100);
      fireEvent.change(input, { target: { value: 'abc' } });

      // 快进到延迟结束
      vi.advanceTimersByTime(500);

      // 只应该调用一次，值为最后输入的
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('abc');
    });

    it('应该同步外部 value 变化', () => {
      const onChange = vi.fn();
      const { rerender } = render(<DebouncedInput value="initial" onChange={onChange} />);

      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('initial');

      // 外部更新 value
      rerender(<DebouncedInput value="updated" onChange={onChange} />);

      expect(input.value).toBe('updated');
    });
  });

  describe('ConditionalRender', () => {
    it('应该在条件为 true 时渲染子组件', () => {
      render(
        <ConditionalRender condition={true}>
          <div>Content</div>
        </ConditionalRender>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('应该在条件为 false 时不渲染子组件', () => {
      render(
        <ConditionalRender condition={false}>
          <div>Content</div>
        </ConditionalRender>
      );

      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('应该在条件为 false 时渲染 fallback', () => {
      render(
        <ConditionalRender condition={false} fallback={<div>Fallback</div>}>
          <div>Content</div>
        </ConditionalRender>
      );

      expect(screen.queryByText('Content')).not.toBeInTheDocument();
      expect(screen.getByText('Fallback')).toBeInTheDocument();
    });

    it('应该响应条件变化', () => {
      const { rerender } = render(
        <ConditionalRender condition={false}>
          <div>Content</div>
        </ConditionalRender>
      );

      expect(screen.queryByText('Content')).not.toBeInTheDocument();

      rerender(
        <ConditionalRender condition={true}>
          <div>Content</div>
        </ConditionalRender>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('ThrottledScrollContainer', () => {
    it('应该渲染子组件', () => {
      const onScroll = vi.fn();
      render(
        <ThrottledScrollContainer onScroll={onScroll}>
          <div>Content</div>
        </ThrottledScrollContainer>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('应该在滚动时调用 onScroll', () => {
      const onScroll = vi.fn();
      const { container } = render(
        <ThrottledScrollContainer onScroll={onScroll} throttleDelay={200}>
          <div>Content</div>
        </ThrottledScrollContainer>
      );

      const scrollContainer = container.firstChild as HTMLElement;
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 100, writable: true });
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1000, writable: true });
      Object.defineProperty(scrollContainer, 'clientHeight', { value: 500, writable: true });

      fireEvent.scroll(scrollContainer);

      expect(onScroll).toHaveBeenCalledWith(100, 1000, 500);
    });

    it('应该节流滚动事件', () => {
      const onScroll = vi.fn();
      const { container } = render(
        <ThrottledScrollContainer onScroll={onScroll} throttleDelay={200}>
          <div>Content</div>
        </ThrottledScrollContainer>
      );

      const scrollContainer = container.firstChild as HTMLElement;

      // 快速触发多次滚动
      fireEvent.scroll(scrollContainer);
      fireEvent.scroll(scrollContainer);
      fireEvent.scroll(scrollContainer);

      // 应该只调用一次
      expect(onScroll).toHaveBeenCalledTimes(1);
    });

    it('应该应用自定义 className', () => {
      const onScroll = vi.fn();
      const { container } = render(
        <ThrottledScrollContainer onScroll={onScroll} className="custom-scroll">
          <div>Content</div>
        </ThrottledScrollContainer>
      );

      expect(container.querySelector('.custom-scroll')).toBeInTheDocument();
    });
  });

  describe('InfiniteScroll', () => {
    it('应该渲染子组件', () => {
      const loadMore = vi.fn();
      render(
        <InfiniteScroll hasMore={true} loadMore={loadMore}>
          <div>Content</div>
        </InfiniteScroll>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('应该在加载时显示 loader', () => {
      const loadMore = vi.fn();
      render(
        <InfiniteScroll hasMore={true} loadMore={loadMore} loading={true}>
          <div>Content</div>
        </InfiniteScroll>
      );

      expect(screen.getByText('加载中...')).toBeInTheDocument();
    });

    it('应该在没有更多时显示结束消息', () => {
      const loadMore = vi.fn();
      render(
        <InfiniteScroll hasMore={false} loadMore={loadMore}>
          <div>Content</div>
        </InfiniteScroll>
      );

      expect(screen.getByText('没有更多了')).toBeInTheDocument();
    });

    it('应该使用自定义 loader', () => {
      const loadMore = vi.fn();
      render(
        <InfiniteScroll hasMore={true} loadMore={loadMore} loading={true} loader={<div>Loading more...</div>}>
          <div>Content</div>
        </InfiniteScroll>
      );

      expect(screen.getByText('Loading more...')).toBeInTheDocument();
    });

    it('应该使用自定义结束消息', () => {
      const loadMore = vi.fn();
      render(
        <InfiniteScroll hasMore={false} loadMore={loadMore} endMessage={<div>End of list</div>}>
          <div>Content</div>
        </InfiniteScroll>
      );

      expect(screen.getByText('End of list')).toBeInTheDocument();
    });
  });

  describe('DelayedRender', () => {
    it('应该初始显示占位符', () => {
      render(
        <DelayedRender delay={1000} placeholder={<div>Placeholder</div>}>
          <div>Content</div>
        </DelayedRender>
      );

      expect(screen.getByText('Placeholder')).toBeInTheDocument();
      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('应该在延迟后显示内容', () => {
      render(
        <DelayedRender delay={500}>
          <div>Content</div>
        </DelayedRender>
      );

      expect(screen.queryByText('Content')).not.toBeInTheDocument();

      // 快进时间
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('应该使用默认 1000ms 延迟', () => {
      render(
        <DelayedRender>
          <div>Content</div>
        </DelayedRender>
      );

      act(() => {
        vi.advanceTimersByTime(999);
      });
      expect(screen.queryByText('Content')).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('VisibilityToggle', () => {
    it('应该在 visible=true 时显示内容', () => {
      render(
        <VisibilityToggle visible={true}>
          <div>Content</div>
        </VisibilityToggle>
      );

      const content = screen.getByText('Content');
      expect(content).toBeInTheDocument();
      expect(content.parentElement).toHaveStyle({ opacity: 1 });
    });

    it('应该在 visible=false 时隐藏内容', () => {
      render(
        <VisibilityToggle visible={false}>
          <div>Content</div>
        </VisibilityToggle>
      );

      const content = screen.getByText('Content');
      expect(content.parentElement).toHaveStyle({ opacity: 0 });
    });

    it('应该在 unmountOnHide=true 时卸载组件', () => {
      const { rerender } = render(
        <VisibilityToggle visible={true} unmountOnHide={true}>
          <div>Content</div>
        </VisibilityToggle>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();

      rerender(
        <VisibilityToggle visible={false} unmountOnHide={true}>
          <div>Content</div>
        </VisibilityToggle>
      );

      expect(screen.queryByText('Content')).not.toBeInTheDocument();
    });

    it('应该使用自定义动画时长', () => {
      render(
        <VisibilityToggle visible={true} animationDuration={500}>
          <div>Content</div>
        </VisibilityToggle>
      );

      const content = screen.getByText('Content');
      expect(content.parentElement).toHaveStyle({ transition: 'opacity 500ms' });
    });
  });

  describe('BatchSelect', () => {
    const mockItems = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '3', name: 'Item 3' },
    ];

    const keyExtractor = (item: typeof mockItems[0]) => item.id;
    const renderItem = (item: typeof mockItems[0], selected: boolean, onToggle: () => void) => (
      <div>
        <input type="checkbox" checked={selected} onChange={onToggle} />
        <span>{item.name}</span>
      </div>
    );

    it('应该渲染所有项目', () => {
      const onSelectionChange = vi.fn();
      render(
        <BatchSelect
          items={mockItems}
          selectedIds={[]}
          onSelectionChange={onSelectionChange}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
        />
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('应该渲染全选复选框', () => {
      const onSelectionChange = vi.fn();
      render(
        <BatchSelect
          items={mockItems}
          selectedIds={[]}
          onSelectionChange={onSelectionChange}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
        />
      );

      expect(screen.getByText('全选')).toBeInTheDocument();
    });

    it('应该切换单个项目选择', () => {
      const onSelectionChange = vi.fn();
      render(
        <BatchSelect
          items={mockItems}
          selectedIds={[]}
          onSelectionChange={onSelectionChange}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      // 第一个是全选，第二个是第一个项目
      fireEvent.click(checkboxes[1]);

      expect(onSelectionChange).toHaveBeenCalledWith(['1']);
    });

    it('应该全选所有项目', () => {
      const onSelectionChange = vi.fn();
      render(
        <BatchSelect
          items={mockItems}
          selectedIds={[]}
          onSelectionChange={onSelectionChange}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
        />
      );

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox);

      expect(onSelectionChange).toHaveBeenCalledWith(['1', '2', '3']);
    });

    it('应该取消全选', () => {
      const onSelectionChange = vi.fn();
      render(
        <BatchSelect
          items={mockItems}
          selectedIds={['1', '2', '3']}
          onSelectionChange={onSelectionChange}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
        />
      );

      const selectAllCheckbox = screen.getAllByRole('checkbox')[0];
      fireEvent.click(selectAllCheckbox);

      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it('应该显示批量操作', () => {
      const onSelectionChange = vi.fn();
      const renderBatchActions = (count: number, clear: () => void) => (
        <div>
          <span>{count} 项已选择</span>
          <button onClick={clear}>清除</button>
        </div>
      );

      render(
        <BatchSelect
          items={mockItems}
          selectedIds={['1', '2']}
          onSelectionChange={onSelectionChange}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderBatchActions={renderBatchActions}
        />
      );

      expect(screen.getByText('2 项已选择')).toBeInTheDocument();
    });

    it('应该清除选择', () => {
      const onSelectionChange = vi.fn();
      const renderBatchActions = (count: number, clear: () => void) => (
        <div>
          <button onClick={clear}>清除</button>
        </div>
      );

      render(
        <BatchSelect
          items={mockItems}
          selectedIds={['1', '2']}
          onSelectionChange={onSelectionChange}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderBatchActions={renderBatchActions}
        />
      );

      const clearButton = screen.getByText('清除');
      fireEvent.click(clearButton);

      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });
  });
});
