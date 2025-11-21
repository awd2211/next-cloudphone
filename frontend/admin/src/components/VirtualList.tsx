import React, { useCallback } from 'react';
import { List, RowComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';

/**
 * 虚拟滚动列表组件
 *
 * 使用 react-window 实现高性能长列表渲染
 * 只渲染可见区域的项，大幅提升性能
 */

// Row props for react-window 2.x
interface VirtualListRowProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

function VirtualList<T>({ items, itemHeight, renderItem, className }: VirtualListProps<T>) {
  // 渲染单个行组件 - react-window 2.x 风格
  const RowComponent = useCallback(
    (props: RowComponentProps<VirtualListRowProps<T>>) => {
      const { index, style, ariaAttributes, items: rowItems, renderItem: render, className: rowClassName } = props;
      const item = rowItems[index];

      // 防止 undefined
      if (!item) {
        return <div style={style} {...ariaAttributes} />;
      }

      return (
        <div style={style} className={rowClassName} {...ariaAttributes}>
          {render(item, index)}
        </div>
      );
    },
    []
  );

  return (
    <AutoSizer>
      {({ height, width }) => (
        <List
          rowComponent={RowComponent}
          rowProps={{
            items,
            renderItem,
            className,
          }}
          rowCount={items.length}
          rowHeight={itemHeight}
          style={{ height, width }}
        />
      )}
    </AutoSizer>
  );
}

export default VirtualList;
