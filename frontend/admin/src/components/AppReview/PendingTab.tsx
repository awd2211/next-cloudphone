import { memo } from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Application } from '@/types';

interface PendingTabProps {
  apps: Application[];
  loading: boolean;
  columns: ColumnsType<Application>;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
}

export const PendingTab = memo<PendingTabProps>(
  ({ apps, loading, columns, page, pageSize, total, onPageChange }) => {
    return (
      <Table
        columns={columns}
        dataSource={apps}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1400 }}
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

PendingTab.displayName = 'PendingTab';
