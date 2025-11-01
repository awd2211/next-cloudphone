import { memo } from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { NotificationTemplate } from '@/types';

interface TemplateTableProps {
  templates: NotificationTemplate[];
  loading: boolean;
  columns: ColumnsType<NotificationTemplate>;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
}

export const TemplateTable = memo<TemplateTableProps>(
  ({ templates, loading, columns, page, pageSize, total, onPageChange }) => {
    return (
      <Table
        columns={columns}
        dataSource={templates}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (newPage, newPageSize) => onPageChange(newPage, newPageSize || 10),
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
        }}
        scroll={{ x: 1400 }}
      />
    );
  }
);

TemplateTable.displayName = 'TemplateTable';
