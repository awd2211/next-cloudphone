/**
 * RuleTableCard - 规则表格卡片组件
 * 使用 React.memo 优化，避免不必要的重渲染
 */
import { memo } from 'react';
import { Table } from 'antd';
import type { LifecycleRule } from '@/types';
import { createRuleColumns } from './lifecycleTableColumns';

interface RuleTableCardProps {
  rules: LifecycleRule[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (newPage: number, newPageSize: number) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onExecute: (id: string, ruleName: string) => void;
  onTest: (id: string, ruleName: string) => void;
  onEdit: (rule: LifecycleRule) => void;
  onDelete: (id: string) => void;
}

/**
 * RuleTableCard 组件
 * 显示生命周期规则列表表格
 */
export const RuleTableCard = memo<RuleTableCardProps>(
  ({ rules, loading, page, pageSize, total, onPageChange, onToggle, onExecute, onTest, onEdit, onDelete }) => {
    const columns = createRuleColumns({
      onToggle,
      onExecute,
      onTest,
      onEdit,
      onDelete,
    });

    return (
      <Table
        columns={columns}
        dataSource={rules}
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
        scroll={{ x: 1500 }}
      />
    );
  }
);

RuleTableCard.displayName = 'RuleTableCard';
