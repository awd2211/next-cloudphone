import { memo } from 'react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Device } from '@/types';

interface DeviceTableProps {
  columns: ColumnsType<Device>;
  dataSource: Device[];
  loading: boolean;
  selectedRowKeys: React.Key[];
  onSelectionChange: (selectedRowKeys: React.Key[]) => void;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number, pageSize: number) => void;
}

/**
 * 设备列表表格组件
 * 支持分页、排序、行选择
 */
export const DeviceTable = memo<DeviceTableProps>(
  ({
    columns,
    dataSource,
    loading,
    selectedRowKeys,
    onSelectionChange,
    page,
    pageSize,
    total,
    onPageChange,
  }) => {
    return (
      <Table<Device>
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: onSelectionChange,
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 台设备`,
          onChange: onPageChange,
        }}
        scroll={{ x: 1200 }}
      />
    );
  }
);

DeviceTable.displayName = 'DeviceTable';
