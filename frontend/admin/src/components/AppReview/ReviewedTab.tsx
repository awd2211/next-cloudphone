import { memo } from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Application } from '@/types';

interface ReviewedTabProps {
  apps: Application[];
  loading: boolean;
  columns: ColumnsType<Application>;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
}

export const ReviewedTab = memo<ReviewedTabProps>(
  ({ apps, loading, columns, page, pageSize, total, onPageChange }) => {
    return (
      <Table
        columns={columns}
        dataSource={apps}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize: pageSize,
          total: total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: onPageChange,
        }}
      />
    );
  }
);

ReviewedTab.displayName = 'ReviewedTab';
