/**
 * HistoryTableCard - 历史表格卡片组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Table } from 'antd';
import type { LifecycleExecutionHistory } from '@/types';
import { createHistoryColumns } from './lifecycleTableColumns';

interface HistoryTableCardProps {
  history: LifecycleExecutionHistory[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (newPage: number, newPageSize: number) => void;
  onViewDetail: (history: LifecycleExecutionHistory) => void;
}

/**
 * HistoryTableCard 组件
 * 显示生命周期规则执行历史列表表格
 */
export const HistoryTableCard = memo<HistoryTableCardProps>(
  ({ history, loading, page, pageSize, total, onPageChange, onViewDetail }) => {
    const columns = createHistoryColumns({
      onViewDetail,
    });

    return (
      <Table
        columns={columns}
        dataSource={history}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: onPageChange,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 1200 }}
      />
    );
  }
);

HistoryTableCard.displayName = 'HistoryTableCard';
