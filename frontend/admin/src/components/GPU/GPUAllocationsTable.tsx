import { memo, useMemo } from 'react';
import { Table, Button } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { GPUAllocation } from '@/services/gpu';
import dayjs from 'dayjs';
import { ALLOCATION_TABLE_SCROLL_X } from './constants';

export interface GPUAllocationsTableProps {
  allocations: GPUAllocation[];
  onDeallocate: (gpuId: string, deviceId?: string) => void;
}

/**
 * GPU 分配记录表格组件
 */
export const GPUAllocationsTable = memo<GPUAllocationsTableProps>(({ allocations, onDeallocate }) => {
  const columns: ColumnsType<GPUAllocation> = useMemo(
    () => [
      {
        title: 'GPU ID',
        dataIndex: 'gpuId',
        key: 'gpuId',
        width: 120,
        render: (id) => id.substring(0, 12),
      },
      {
        title: '设备 ID',
        dataIndex: 'deviceId',
        key: 'deviceId',
        width: 120,
        render: (id) => id.substring(0, 12),
      },
      {
        title: '用户 ID',
        dataIndex: 'userId',
        key: 'userId',
        width: 120,
        render: (id) => id.substring(0, 12),
      },
      {
        title: '分配时间',
        dataIndex: 'allocatedAt',
        key: 'allocatedAt',
        width: 160,
        render: (time) => dayjs(time).format('MM-DD HH:mm'),
      },
      {
        title: '平均使用率',
        key: 'avgUtilization',
        width: 120,
        render: (_, record) => (record.usageStats ? `${record.usageStats.avgUtilization}%` : '-'),
      },
      {
        title: '峰值使用率',
        key: 'peakUtilization',
        width: 120,
        render: (_, record) => (record.usageStats ? `${record.usageStats.peakUtilization}%` : '-'),
      },
      {
        title: '操作',
        key: 'actions',
        width: 100,
        render: (_, record) => (
          <Button
            type="link"
            size="small"
            danger
            onClick={() => onDeallocate(record.gpuId, record.deviceId)}
          >
            释放
          </Button>
        ),
      },
    ],
    [onDeallocate],
  );

  return (
    <Table
      columns={columns}
      dataSource={allocations}
      rowKey="id"
      pagination={{ pageSize: 10 }}
      scroll={{ x: ALLOCATION_TABLE_SCROLL_X }}
    />
  );
});

GPUAllocationsTable.displayName = 'GPUAllocationsTable';
