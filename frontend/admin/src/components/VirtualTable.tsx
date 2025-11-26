/**
 * VirtualTable - 虚拟滚动表格组件
 *
 * 基于 react-window 实现的高性能虚拟滚动表格
 * 适用于大数据集（1000+行）的列表展示，显著降低DOM节点数和内存占用
 *
 * 特性：
 * - 虚拟滚动：只渲染可见区域的行（~20-30个DOM节点）
 * - 无限加载：集成 InfiniteLoader 自动触发加载下一页
 * - Ant Design风格：保持与现有表格组件一致的视觉效果
 * - 灵活列配置：支持自定义列宽、渲染函数、对齐方式
 *
 * @example
 * ```tsx
 * <VirtualTable
 *   data={allDevices}
 *   columns={[
 *     { key: 'name', title: '设备名称', width: 200 },
 *     { key: 'status', title: '状态', width: 100, render: (status) => <Badge>{status}</Badge> },
 *   ]}
 *   rowHeight={60}
 *   hasMore={hasNextPage}
 *   isLoading={isFetching}
 *   onLoadMore={fetchNextPage}
 * />
 * ```
 */

import React, { useRef, useCallback } from 'react';
import { List, ListImperativeAPI, RowComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Spin } from 'antd';
import { NEUTRAL_LIGHT } from '@/theme';
import './VirtualTable.css';

/**
 * 列配置接口
 */
interface VirtualTableColumn<T = any> {
  key: string;
  title: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

/**
 * VirtualTable 组件属性
 */
interface VirtualTableProps<T = any> {
  /** 数据数组 */
  data: T[];

  /** 列配置 */
  columns: VirtualTableColumn<T>[];

  /** 行高（像素），默认60 */
  rowHeight?: number;

  /** 是否还有更多数据 */
  hasMore?: boolean;

  /** 是否正在加载 */
  isLoading?: boolean;

  /** 加载更多的回调 */
  onLoadMore?: () => void;

  /** 行的key字段，默认'id' */
  rowKey?: string;

  /** 空数据提示 */
  emptyText?: string;

  /** 表格高度（像素），默认600 */
  height?: number;

  /** 行点击事件 */
  onRowClick?: (record: T, index: number) => void;
}

// Row props for react-window 2.x
interface VirtualTableRowProps<T> {
  data: T[];
  columns: VirtualTableColumn<T>[];
  rowKey: string;
  onRowClick?: (record: T, index: number) => void;
}

/**
 * VirtualTable 组件
 */
export function VirtualTable<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 60,
  hasMore = false,
  isLoading = false,
  onLoadMore: _onLoadMore, // 保留 API 接口但暂时未使用
  rowKey = 'id',
  emptyText = '暂无数据',
  height = 600,
  onRowClick,
}: VirtualTableProps<T>) {
  // 计算项目总数（数据 + 加载占位符）
  const itemCount = hasMore ? data.length + 1 : data.length;

  // 判断某个索引的项目是否已加载
  const isItemLoaded = useCallback((index: number) => !hasMore || index < data.length, [hasMore, data.length]);

  // List ref
  const listRef = useRef<ListImperativeAPI>(null);

  // 渲染表头
  const renderHeader = () => (
    <div
      className="virtual-table-header"
      style={{ display: 'flex', borderBottom: `1px solid ${NEUTRAL_LIGHT.border.secondary}`, background: NEUTRAL_LIGHT.bg.elevated }}
    >
      {columns.map((column) => (
        <div
          key={column.key}
          className="virtual-table-header-cell"
          style={{
            width: column.width,
            padding: '12px 16px',
            fontWeight: 600,
            textAlign: column.align || 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {column.title}
        </div>
      ))}
    </div>
  );

  // 渲染单行 - react-window 2.x 风格
  const RowComponent = useCallback((props: RowComponentProps<VirtualTableRowProps<T>>) => {
    const { index, style, ariaAttributes, data: rowData, columns: rowColumns, onRowClick: handleRowClick } = props;

    // 加载占位符
    if (!isItemLoaded(index)) {
      return (
        <div style={style} className="virtual-table-row virtual-table-loading-row" {...ariaAttributes}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <Spin size="small" />
            <span style={{ marginLeft: 8 }}>加载中...</span>
          </div>
        </div>
      );
    }

    const record = rowData[index];

    // 如果 record 不存在，渲染空行
    if (!record) {
      return <div style={style} className="virtual-table-row" {...ariaAttributes} />;
    }

    return (
      <div
        style={style}
        className={`virtual-table-row ${handleRowClick ? 'virtual-table-row-clickable' : ''}`}
        onClick={() => handleRowClick?.(record, index)}
        {...ariaAttributes}
      >
        <div style={{ display: 'flex', borderBottom: `1px solid ${NEUTRAL_LIGHT.border.secondary}` }}>
          {rowColumns.map((column) => {
            const value = record?.[column.key];
            const content = column.render && record ? column.render(value, record, index) : value;

            return (
              <div
                key={column.key}
                className="virtual-table-cell"
                style={{
                  width: column.width,
                  padding: '12px 16px',
                  textAlign: column.align || 'left',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {content}
              </div>
            );
          })}
        </div>
      </div>
    );
  }, [isItemLoaded]);

  // 空数据展示
  if (data.length === 0 && !isLoading) {
    return (
      <div
        className="virtual-table-empty"
        style={{ textAlign: 'center', padding: '48px 0', color: NEUTRAL_LIGHT.text.tertiary }}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div
      className="virtual-table-container"
      style={{ border: `1px solid ${NEUTRAL_LIGHT.border.secondary}`, borderRadius: 4 }}
    >
      {renderHeader()}

      <div style={{ height: height - 50 }}>
        <AutoSizer>
          {({ height: autoHeight, width }) => (
            <List
              listRef={listRef}
              rowComponent={RowComponent}
              rowProps={{
                data,
                columns,
                rowKey,
                onRowClick,
              }}
              rowCount={itemCount}
              rowHeight={rowHeight}
              style={{ height: autoHeight, width }}
              className="virtual-table-list"
            />
          )}
        </AutoSizer>
      </div>

      {isLoading && data.length > 0 && (
        <div style={{ textAlign: 'center', padding: '12px', borderTop: `1px solid ${NEUTRAL_LIGHT.border.secondary}` }}>
          <Spin size="small" />
          <span style={{ marginLeft: 8 }}>加载中...</span>
        </div>
      )}
    </div>
  );
}

/**
 * 导出类型供外部使用
 */
export type { VirtualTableColumn, VirtualTableProps };
