import { memo } from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AppReviewRecord } from '@/types';

interface RecordsTabProps {
  records: AppReviewRecord[];
  loading: boolean;
  columns: ColumnsType<AppReviewRecord>;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
}

export const RecordsTab = memo<RecordsTabProps>(
  ({ records, loading, columns, page, pageSize, total, onPageChange }) => {
    return (
      <Table
        columns={columns}
        dataSource={records}
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

RecordsTab.displayName = 'RecordsTab';
