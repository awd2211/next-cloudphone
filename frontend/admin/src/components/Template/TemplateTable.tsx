import { memo } from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DeviceTemplate } from '@/types';

interface TemplateTableProps {
  columns: ColumnsType<DeviceTemplate>;
  dataSource: DeviceTemplate[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
}

export const TemplateTable = memo<TemplateTableProps>(
  ({ columns, dataSource, loading, page, pageSize, total, onPageChange }) => {
    return (
      <Table
        columns={columns}
        dataSource={dataSource}
        rowKey="id"
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: onPageChange,
        }}
      />
    );
  }
);

TemplateTable.displayName = 'TemplateTable';
