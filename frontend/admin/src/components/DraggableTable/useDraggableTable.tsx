/**
 * 可拖拽表格 Hook
 *
 * 基于 @dnd-kit 实现的表格行拖拽功能
 * 支持：
 * 1. 拖拽排序
 * 2. 拖拽手柄
 * 3. 拖拽预览
 * 4. 排序持久化
 */

import React, { useMemo, useState, useEffect } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { HolderOutlined } from '@ant-design/icons';
import type { TableProps } from 'antd';

interface DraggableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string;
}

/**
 * 可拖拽的表格行组件
 */
const DraggableRow = ({ children, ...props }: DraggableRowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props['data-row-key'],
  });

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Translate.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative', zIndex: 9999 } : {}),
  };

  return (
    <tr {...props} ref={setNodeRef} style={style} {...attributes}>
      {React.Children.map(children, (child) => {
        if ((child as React.ReactElement).key === 'sort') {
          return React.cloneElement(child as React.ReactElement, {
            children: (
              <HolderOutlined
                ref={setActivatorNodeRef as any}
                {...listeners}
                style={{
                  touchAction: 'none',
                  cursor: 'move',
                  fontSize: 16,
                  color: '#999',
                }}
              />
            ),
          } as any);
        }
        return child;
      })}
    </tr>
  );
};

export interface UseDraggableTableOptions<T> {
  /** 数据源 */
  dataSource: T[];

  /** 获取数据项的唯一标识 */
  getRowKey: (record: T) => string;

  /** 拖拽排序完成回调 */
  onSortEnd?: (newDataSource: T[]) => void;

  /** 是否禁用拖拽 */
  disabled?: boolean;
}

export interface UseDraggableTableResult<T> {
  /** 当前排序后的数据源 */
  sortedDataSource: T[];

  /** DndContext 组件 */
  DndWrapper: React.FC<{ children: React.ReactNode }>;

  /** 表格组件配置 */
  tableComponents: TableProps<T>['components'];

  /** 拖拽列配置 */
  sortColumn: {
    key: string;
    title: string;
    width: number;
    align: 'center';
    fixed: 'left';
  };
}

/**
 * 可拖拽表格 Hook
 *
 * @example
 * ```tsx
 * const { sortedDataSource, DndWrapper, tableComponents, sortColumn } = useDraggableTable({
 *   dataSource: devices,
 *   getRowKey: (device) => device.id,
 *   onSortEnd: (newDevices) => {
 *     // 保存新的排序到服务器
 *     saveSortOrder(newDevices.map((d, i) => ({ id: d.id, order: i })));
 *   },
 * });
 *
 * return (
 *   <DndWrapper>
 *     <Table
 *       columns={[sortColumn, ...otherColumns]}
 *       dataSource={sortedDataSource}
 *       components={tableComponents}
 *       rowKey="id"
 *     />
 *   </DndWrapper>
 * );
 * ```
 */
export const useDraggableTable = <T extends Record<string, any>>({
  dataSource,
  getRowKey,
  onSortEnd,
  disabled = false,
}: UseDraggableTableOptions<T>): UseDraggableTableResult<T> => {
  // 内部维护排序后的数据源
  const [sortedDataSource, setSortedDataSource] = useState<T[]>(dataSource);

  // 当外部数据源变化时，更新内部状态
  useEffect(() => {
    setSortedDataSource(dataSource);
  }, [dataSource]);

  // 配置传感器（只响应鼠标拖拽，距离>5px）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 移动 5px 后才触发拖拽，避免点击误触发
      },
    })
  );

  // 拖拽结束处理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeIndex = sortedDataSource.findIndex(
      (item) => getRowKey(item) === active.id
    );
    const overIndex = sortedDataSource.findIndex((item) => getRowKey(item) === over.id);

    if (activeIndex !== -1 && overIndex !== -1) {
      const newDataSource = arrayMove(sortedDataSource, activeIndex, overIndex);
      setSortedDataSource(newDataSource);
      onSortEnd?.(newDataSource);
    }
  };

  // DndContext 包装器组件
  const DndWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (disabled) {
      return <>{children}</>;
    }

    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedDataSource.map(getRowKey)}
          strategy={verticalListSortingStrategy}
        >
          {children}
        </SortableContext>
      </DndContext>
    );
  };

  // 表格组件配置
  const tableComponents = useMemo<TableProps<T>['components']>(
    () => ({
      body: {
        row: DraggableRow,
      },
    }),
    []
  );

  // 拖拽列配置
  const sortColumn = useMemo(
    () => ({
      key: 'sort',
      title: '',
      width: 50,
      align: 'center' as const,
      fixed: 'left' as const,
    }),
    []
  );

  return {
    sortedDataSource,
    DndWrapper,
    tableComponents,
    sortColumn,
  };
};
