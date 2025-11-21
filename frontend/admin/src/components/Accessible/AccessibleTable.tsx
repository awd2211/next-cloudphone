/**
 * 无障碍增强的 Table 组件
 *
 * 在 Ant Design Table 基础上添加完整的 ARIA 支持
 * - 表格区域标签
 * - 排序按钮的 ARIA 属性
 * - 分页导航的 ARIA 属性
 * - 加载状态的屏幕阅读器提示
 * - 空状态的语义化处理
 */

import { Table, TableProps, Empty } from 'antd';
import type { ColumnType } from 'antd/es/table';
import { ariaLabels, VisuallyHidden } from '@/utils/accessibility';
import { useMemo } from 'react';

export interface AccessibleTableProps<T> extends TableProps<T> {
  /**
   * 表格的无障碍标签（用于屏幕阅读器）
   */
  ariaLabel: string;

  /**
   * 是否为加载状态的描述文字
   */
  loadingText?: string;

  /**
   * 空状态的描述文字
   */
  emptyText?: string;

  /**
   * 是否显示行号列（带 ARIA 标签）
   */
  showRowNumber?: boolean;
}

/**
 * 增强列的 ARIA 属性
 */
function enhanceColumnWithAria<T>(column: ColumnType<T>): ColumnType<T> {
  return {
    ...column,
    // 如果列可排序，添加 ARIA 属性
    ...(column.sorter && {
      title: column.title,
      onHeaderCell: (col) => ({
        ...column.onHeaderCell?.(col),
        ...ariaLabels.table.sortButton(
          typeof column.title === 'string' ? column.title : '列',
          // @ts-ignore - sortOrder 在运行时可能存在
          column.sortOrder as 'ascending' | 'descending' | undefined
        ),
      }),
    }),
  };
}

/**
 * 无障碍增强的 Table 组件
 *
 * 使用示例：
 * ```tsx
 * <AccessibleTable
 *   ariaLabel="用户列表"
 *   columns={columns}
 *   dataSource={users}
 *   loading={isLoading}
 *   loadingText="正在加载用户列表"
 *   emptyText="暂无用户数据"
 * />
 * ```
 */
function AccessibleTable<T extends object>({
  ariaLabel,
  loadingText = '正在加载数据',
  emptyText = '暂无数据',
  showRowNumber = false,
  columns = [],
  loading,
  locale,
  pagination,
  ...restProps
}: AccessibleTableProps<T>) {
  // 增强列的 ARIA 属性
  const enhancedColumns = useMemo(() => {
    const cols: ColumnType<T>[] = [...columns.map(enhanceColumnWithAria)];

    // 添加行号列
    if (showRowNumber) {
      cols.unshift({
        title: '序号',
        key: 'rowNumber',
        width: 60,
        fixed: 'left',
        align: 'center',
        render: (_: unknown, __: T, index: number) => {
          const currentPage =
            typeof pagination === 'object' ? pagination.current || 1 : 1;
          const pageSize =
            typeof pagination === 'object' ? pagination.pageSize || 10 : 10;
          const rowNumber = (currentPage - 1) * pageSize + index + 1;

          return (
            <span aria-label={`第 ${rowNumber} 行`}>
              {rowNumber}
            </span>
          );
        },
        onHeaderCell: () => ({
          'aria-label': '行序号',
        }),
      });
    }

    return cols;
  }, [columns, showRowNumber, pagination]);

  // 增强分页的 ARIA 属性
  const enhancedPagination = useMemo(() => {
    if (!pagination || typeof pagination === 'boolean') return pagination;

    return {
      ...(typeof pagination === 'object' ? pagination : {}),
      // 添加分页导航的 ARIA 属性
      itemRender: (page: number, type: string, originalElement: React.ReactNode) => {
        const currentPage = typeof pagination === 'object' ? pagination.current || 1 : 1;

        if (type === 'prev') {
          return (
            <span {...ariaLabels.table.pagination.prevButton(currentPage === 1)}>
              {originalElement}
            </span>
          );
        }

        if (type === 'next') {
          const total = typeof pagination === 'object' ? pagination.total || 0 : 0;
          const pageSize = typeof pagination === 'object' ? pagination.pageSize || 10 : 10;
          const totalPages = Math.ceil(total / pageSize);
          return (
            <span {...ariaLabels.table.pagination.nextButton(currentPage >= totalPages)}>
              {originalElement}
            </span>
          );
        }

        if (type === 'page') {
          return (
            <span {...ariaLabels.table.pagination.button(page, page === currentPage)}>
              {originalElement}
            </span>
          );
        }

        return originalElement;
      },
    };
  }, [pagination]);

  // 增强 locale 的无障碍文本
  const enhancedLocale = useMemo(
    () => ({
      emptyText: (
        <Empty
          description={
            <>
              <span aria-live="polite">{emptyText}</span>
              <VisuallyHidden>表格当前无数据</VisuallyHidden>
            </>
          }
        />
      ),
      ...locale,
    }),
    [locale, emptyText]
  );

  return (
    <div {...ariaLabels.table.wrapper(ariaLabel)}>
      {/* 加载状态的屏幕阅读器提示 */}
      {loading && (
        <VisuallyHidden>
          <div aria-live="polite" aria-busy="true">
            {loadingText}
          </div>
        </VisuallyHidden>
      )}

      <Table<T>
        {...restProps}
        columns={enhancedColumns}
        loading={loading}
        locale={enhancedLocale}
        pagination={enhancedPagination}
        // 添加表格容器的 ARIA 属性
        components={{
          table: (props) => (
            <table
              {...props}
              role="table"
              aria-label={ariaLabel}
              aria-busy={loading}
            />
          ),
        }}
      />
    </div>
  );
}

export default AccessibleTable;
