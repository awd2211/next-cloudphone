import { useMemo } from 'react';
import { theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Device } from '@/types';
import dayjs from 'dayjs';
import { DeviceStatusTag, DeviceActions, DeviceQuickPreview } from '@/components/Device';

interface UseDeviceColumnsProps {
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onReboot: (id: string) => void;
  onDelete: (id: string) => void;
  loading: {
    start: boolean;
    stop: boolean;
    reboot: boolean;
    delete: boolean;
  };
}

/**
 * 设备列表表格列定义 Hook
 */
export const useDeviceColumns = ({
  onStart,
  onStop,
  onReboot,
  onDelete,
  loading,
}: UseDeviceColumnsProps): ColumnsType<Device> => {
  const { token } = theme.useToken();
  return useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 120,
        ellipsis: true,
        render: (id: string) => (
          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{id.substring(0, 8)}...</span>
        ),
      },
      {
        title: '设备名称',
        dataIndex: 'name',
        key: 'name',
        width: 150,
        ellipsis: true,
        sorter: (a, b) => a.name.localeCompare(b.name),
        render: (_name: string, record: Device) => (
          <DeviceQuickPreview device={record}>
            <span style={{ cursor: 'pointer', color: token.colorPrimary, fontWeight: 500 }}>
              {record.name}
            </span>
          </DeviceQuickPreview>
        ),
      },
      {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        width: 100,
        sorter: (a, b) => a.status.localeCompare(b.status),
        render: (status: string) => <DeviceStatusTag status={status as any} />,
        responsive: ['md'],
      },
      {
        title: 'Android版本',
        dataIndex: 'androidVersion',
        key: 'androidVersion',
        width: 120,
        sorter: (a, b) => (a.androidVersion || '').localeCompare(b.androidVersion || ''),
        responsive: ['lg'],
      },
      {
        title: 'CPU',
        dataIndex: 'cpuCores',
        key: 'cpuCores',
        width: 80,
        sorter: (a, b) => a.cpuCores - b.cpuCores,
        render: (cores: number) => `${cores}核`,
        responsive: ['lg'],
      },
      {
        title: '内存',
        dataIndex: 'memoryMB',
        key: 'memoryMB',
        width: 100,
        sorter: (a, b) => a.memoryMB - b.memoryMB,
        render: (memory: number) => `${(memory / 1024).toFixed(1)}GB`,
        responsive: ['lg'],
      },
      {
        title: 'IP地址',
        dataIndex: 'ipAddress',
        key: 'ipAddress',
        width: 130,
        ellipsis: true,
        sorter: (a, b) => (a.ipAddress || '').localeCompare(b.ipAddress || ''),
        responsive: ['xl'],
      },
      {
        title: '创建时间',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 160,
        sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        render: (date: string) => dayjs(date).format('MM-DD HH:mm'),
        responsive: ['xl'],
      },
      {
        title: '操作',
        key: 'actions',
        width: 250,
        fixed: 'right',
        render: (_: any, record: Device) => (
          <DeviceActions
            device={record}
            onStart={onStart}
            onStop={onStop}
            onReboot={onReboot}
            onDelete={onDelete}
            loading={loading}
          />
        ),
      },
    ],
    [onStart, onStop, onReboot, onDelete, loading]
  );
};
