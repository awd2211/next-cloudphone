/**
 * 可拖动列宽管理 Hook
 *
 * 功能：
 * 1. 管理表格列宽状态
 * 2. 持久化列宽到 localStorage
 * 3. 支持拖动调整列宽
 * 4. 提供表格 components 配置
 */
import { useState, useCallback, useMemo, useEffect, SyntheticEvent } from 'react';
import type { ColumnsType, ColumnType } from 'antd/es/table';
import type { ResizeCallbackData } from 'react-resizable';
import { ResizableTitle } from './ResizableTitle';

// 存储的列宽类型
interface ColumnWidths {
  [key: string]: number;
}

interface UseResizableColumnsOptions<T> {
  /** 原始列配置 */
  columns: ColumnsType<T>;
  /** localStorage 存储键名 */
  storageKey?: string;
  /** 默认列宽（当列没有设置 width 时使用） */
  defaultWidth?: number;
  /** 最小列宽 */
  minWidth?: number;
  /** 最大列宽 */
  maxWidth?: number;
}

interface UseResizableColumnsResult<T> {
  /** 带有拖动功能的列配置 */
  columns: ColumnsType<T>;
  /** 表格 components 配置（用于替换 th 元素） */
  components: {
    header: {
      cell: typeof ResizableTitle;
    };
  };
  /** 重置列宽到默认值 */
  resetWidths: () => void;
}

/**
 * 从 localStorage 读取列宽配置
 */
const loadWidths = (storageKey: string): ColumnWidths => {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

/**
 * 保存列宽配置到 localStorage
 */
const saveWidths = (storageKey: string, widths: ColumnWidths): void => {
  try {
    localStorage.setItem(storageKey, JSON.stringify(widths));
  } catch {
    // 忽略 localStorage 写入错误
  }
};

/**
 * 可拖动列宽管理 Hook
 *
 * @example
 * ```tsx
 * const { columns, components } = useResizableColumns({
 *   columns: originalColumns,
 *   storageKey: 'user-table-column-widths',
 * });
 *
 * <Table columns={columns} components={components} />
 * ```
 */
export function useResizableColumns<T extends object>({
  columns: originalColumns,
  storageKey = 'table-column-widths',
  defaultWidth = 150,
  minWidth = 50,
  maxWidth = 800,
}: UseResizableColumnsOptions<T>): UseResizableColumnsResult<T> {
  // 从 localStorage 初始化列宽
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() =>
    loadWidths(storageKey)
  );

  // 当 storageKey 变化时重新加载
  useEffect(() => {
    setColumnWidths(loadWidths(storageKey));
  }, [storageKey]);

  // 处理列宽调整
  const handleResize = useCallback(
    (key: string) =>
      (_e: SyntheticEvent, { size }: ResizeCallbackData) => {
        // 限制宽度范围
        const newWidth = Math.max(minWidth, Math.min(maxWidth, size.width));

        setColumnWidths((prev) => {
          const newWidths = { ...prev, [key]: newWidth };
          // 持久化到 localStorage
          saveWidths(storageKey, newWidths);
          return newWidths;
        });
      },
    [storageKey, minWidth, maxWidth]
  );

  // 重置列宽
  const resetWidths = useCallback(() => {
    setColumnWidths({});
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // 忽略错误
    }
  }, [storageKey]);

  // 构建带有拖动功能的列配置
  const resizableColumns = useMemo(() => {
    return originalColumns.map((col) => {
      const column = col as ColumnType<T>;
      const key = column.key || column.dataIndex;

      // 如果列没有 key，跳过拖动功能
      if (!key) {
        return col;
      }

      const keyStr = String(key);
      // 使用保存的宽度，或原始宽度，或默认宽度
      const width = columnWidths[keyStr] ?? column.width ?? defaultWidth;

      return {
        ...col,
        width,
        onHeaderCell: () => ({
          width,
          onResize: handleResize(keyStr),
        }),
      } as ColumnType<T>;
    });
  }, [originalColumns, columnWidths, defaultWidth, handleResize]);

  // 表格 components 配置
  const components = useMemo(
    () => ({
      header: {
        cell: ResizableTitle,
      },
    }),
    []
  );

  return {
    columns: resizableColumns,
    components,
    resetWidths,
  };
}

export default useResizableColumns;
