import React from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

// react-window 的类型定义
interface ListChildComponentProps {
  index: number;
  style: React.CSSProperties;
}

/**
 * 虚拟滚动列表组件
 *
 * 使用 react-window 实现高性能长列表渲染
 * 只渲染可见区域的项，大幅提升性能
 */

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

function VirtualList<T>({
  items,
  itemHeight,
  renderItem,
  className
}: VirtualListProps<T>) {
  // 渲染单个行组件
  const Row = ({ index, style }: ListChildComponentProps) => (
    <div style={style} className={className}>
      {renderItem(items[index], index)}
    </div>
  );

  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          height={height}
          itemCount={items.length}
          itemSize={itemHeight}
          width={width}
        >
          {Row}
        </List>
      )}
    </AutoSizer>
  );
}

export default VirtualList;
