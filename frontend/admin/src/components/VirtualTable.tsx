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

import React, { useMemo } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Spin } from 'antd';
import './VirtualTable.css';

/**
 * 列配置接口
 */
export interface VirtualTableColumn<T = any> {
  key: string;
  title: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

/**
 * VirtualTable 组件属性
 */
export interface VirtualTableProps<T = any> {
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

/**
 * VirtualTable 组件
 */
export function VirtualTable<T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 60,
  hasMore = false,
  isLoading = false,
  onLoadMore,
  rowKey = 'id',
  emptyText = '暂无数据',
  height = 600,
  onRowClick,
}: VirtualTableProps<T>) {
  // 计算项目总数（数据 + 加载占位符）
  const itemCount = hasMore ? data.length + 1 : data.length;

  // 判断某个索引的项目是否已加载
  const isItemLoaded = (index: number) => !hasMore || index < data.length;

  // 渲染表头
  const renderHeader = () => (
    <div
      className="virtual-table-header"
      style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}
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

  // 渲染单行
  const Row = ({ index, style }: ListChildComponentProps) => {
    // 加载占位符
    if (!isItemLoaded(index)) {
      return (
        <div style={style} className="virtual-table-row virtual-table-loading-row">
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

    const record = data[index];
    const key = record[rowKey] || index;

    return (
      <div
        key={key}
        style={style}
        className={`virtual-table-row ${onRowClick ? 'virtual-table-row-clickable' : ''}`}
        onClick={() => onRowClick?.(record, index)}
      >
        <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0' }}>
          {columns.map((column) => {
            const value = record[column.key];
            const content = column.render ? column.render(value, record, index) : value;

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
  };

  // 空数据展示
  if (data.length === 0 && !isLoading) {
    return (
      <div
        className="virtual-table-empty"
        style={{ textAlign: 'center', padding: '48px 0', color: '#999' }}
      >
        {emptyText}
      </div>
    );
  }

  return (
    <div
      className="virtual-table-container"
      style={{ border: '1px solid #f0f0f0', borderRadius: 4 }}
    >
      {renderHeader()}

      <InfiniteLoader
        isItemLoaded={isItemLoaded}
        itemCount={itemCount}
        loadMoreItems={onLoadMore || (() => Promise.resolve())}
      >
        {({ onItemsRendered, ref }) => (
          <div style={{ height: height - 50 }}>
            <AutoSizer>
              {({ height: autoHeight, width }) => (
                <List
                  ref={ref}
                  height={autoHeight}
                  itemCount={itemCount}
                  itemSize={rowHeight}
                  width={width}
                  onItemsRendered={onItemsRendered}
                  className="virtual-table-list"
                >
                  {Row}
                </List>
              )}
            </AutoSizer>
          </div>
        )}
      </InfiniteLoader>

      {isLoading && data.length > 0 && (
        <div style={{ textAlign: 'center', padding: '12px', borderTop: '1px solid #f0f0f0' }}>
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
