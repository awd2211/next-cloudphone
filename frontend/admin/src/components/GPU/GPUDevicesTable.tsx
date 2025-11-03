import { memo, useMemo } from 'react';
import { Table, Space, Button, Tag, Progress, Tooltip } from 'antd';
import { LinkOutlined, DisconnectOutlined, FireOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { GPUDevice } from '@/types';
import { getStatusTag, getAllocationModeTag, getTemperatureColor } from './utils';
import { GPU_TABLE_SCROLL_X, UTILIZATION_WARNING } from './constants';

export interface GPUDevicesTableProps {
  gpus: GPUDevice[];
  loading: boolean;
  onAllocate: (gpu: GPUDevice) => void;
  onDeallocate: (gpuId: string, deviceId?: string) => void;
  onViewDetail: (gpu: GPUDevice) => void;
}

/**
 * GPU 设备表格组件
 */
export const GPUDevicesTable = memo<GPUDevicesTableProps>(
  ({ gpus, loading, onAllocate, onDeallocate, onViewDetail }) => {
    const columns: ColumnsType<GPUDevice> = useMemo(
      () => [
        {
          title: 'GPU 名称',
          key: 'name',
          width: 200,
          render: (_, record) => (
            <Space direction="vertical" size={0}>
              <a onClick={() => onViewDetail(record)}>{record.name}</a>
              <span style={{ fontSize: '12px', color: '#8c8c8c' }}>{record.model}</span>
            </Space>
          ),
        },
        {
          title: '节点',
          dataIndex: 'nodeName',
          key: 'nodeName',
          width: 120,
        },
        {
          title: '状态',
          dataIndex: 'status',
          key: 'status',
          width: 100,
          render: (status) => getStatusTag(status),
        },
        {
          title: 'GPU 使用率',
          key: 'utilization',
          width: 150,
          render: (_, record) => (
            <Tooltip title={`${record.utilizationRate}%`}>
              <Progress
                percent={record.utilizationRate}
                size="small"
                status={record.utilizationRate > UTILIZATION_WARNING ? 'exception' : 'normal'}
              />
            </Tooltip>
          ),
        },
        {
          title: '显存',
          key: 'memory',
          width: 150,
          render: (_, record) => {
            const percent = (record.memoryUsed / record.totalMemoryMB) * 100;
            return (
              <Tooltip title={`${record.memoryUsed}MB / ${record.totalMemoryMB}MB`}>
                <Progress
                  percent={Math.round(percent)}
                  size="small"
                  status={percent > UTILIZATION_WARNING ? 'exception' : 'normal'}
                />
              </Tooltip>
            );
          },
        },
        {
          title: '温度',
          dataIndex: 'temperature',
          key: 'temperature',
          width: 100,
          render: (temp) =>
            temp ? (
              <span style={{ color: getTemperatureColor(temp) }}>
                <FireOutlined /> {temp}°C
              </span>
            ) : (
              '-'
            ),
        },
        {
          title: '分配模式',
          dataIndex: 'allocationMode',
          key: 'allocationMode',
          width: 100,
          render: (mode) => getAllocationModeTag(mode),
        },
        {
          title: '分配到',
          dataIndex: 'allocatedTo',
          key: 'allocatedTo',
          width: 120,
          render: (deviceId) => (deviceId ? <Tag color="blue">{deviceId.substring(0, 8)}</Tag> : '-'),
        },
        {
          title: '操作',
          key: 'actions',
          width: 150,
          fixed: 'right',
          render: (_, record) => (
            <Space size="small">
              {!record.allocatedTo ? (
                <Button
                  type="link"
                  size="small"
                  icon={<LinkOutlined />}
                  onClick={() => onAllocate(record)}
                  disabled={record.status !== 'online'}
                >
                  分配
                </Button>
              ) : (
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DisconnectOutlined />}
                  onClick={() => onDeallocate(record.id, record.allocatedTo)}
                >
                  释放
                </Button>
              )}
            </Space>
          ),
        },
      ],
      [onAllocate, onDeallocate, onViewDetail],
    );

    return (
      <Table
        columns={columns}
        dataSource={gpus}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: GPU_TABLE_SCROLL_X }}
      />
    );
  },
);

GPUDevicesTable.displayName = 'GPUDevicesTable';
