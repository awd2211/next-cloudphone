import { useMemo } from 'react';
import { Tag, Progress, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UserMetering, DeviceMetering } from './constants';
import { getProgressStatus } from './constants';

export const useUserMeteringColumns = (): ColumnsType<UserMetering> => {
  return useMemo(
    () => [
      {
        title: '用户',
        dataIndex: 'username',
        key: 'username',
        width: 150,
      },
      {
        title: '设备数',
        dataIndex: 'deviceCount',
        key: 'deviceCount',
        width: 100,
        align: 'center',
        render: (count: number) => <Tag color="blue">{count}</Tag>,
      },
      {
        title: '总时长 (h)',
        dataIndex: 'totalHours',
        key: 'totalHours',
        width: 120,
        align: 'right',
        sorter: (a, b) => a.totalHours - b.totalHours,
        render: (hours: number) => hours.toFixed(2),
      },
      {
        title: 'CPU 时长 (h)',
        dataIndex: 'cpuHours',
        key: 'cpuHours',
        width: 120,
        align: 'right',
        render: (hours: number) => hours.toFixed(2),
      },
      {
        title: '内存 (GB)',
        dataIndex: 'memoryMB',
        key: 'memoryMB',
        width: 120,
        align: 'right',
        render: (mb: number) => (mb / 1024).toFixed(2),
      },
      {
        title: '存储 (GB)',
        dataIndex: 'storageMB',
        key: 'storageMB',
        width: 120,
        align: 'right',
        render: (mb: number) => (mb / 1024).toFixed(2),
      },
      {
        title: '费用 (¥)',
        dataIndex: 'cost',
        key: 'cost',
        width: 120,
        align: 'right',
        sorter: (a, b) => a.cost - b.cost,
        render: (cost: number) => (
          <span style={{ color: '#1890ff', fontWeight: 500 }}>¥{cost.toFixed(2)}</span>
        ),
      },
    ],
    []
  );
};

export const useDeviceMeteringColumns = (): ColumnsType<DeviceMetering> => {
  return useMemo(
    () => [
      {
        title: '设备名称',
        dataIndex: 'deviceName',
        key: 'deviceName',
        width: 150,
      },
      {
        title: '用户 ID',
        dataIndex: 'userId',
        key: 'userId',
        width: 150,
        render: (id: string) => <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{id}</span>,
      },
      {
        title: '运行时长 (h)',
        dataIndex: 'hours',
        key: 'hours',
        width: 120,
        align: 'right',
        sorter: (a, b) => a.hours - b.hours,
        render: (hours: number) => hours.toFixed(2),
      },
      {
        title: 'CPU 使用率',
        dataIndex: 'cpuUsage',
        key: 'cpuUsage',
        width: 150,
        render: (usage: number) => (
          <Progress
            percent={Math.round(usage)}
            size="small"
            status={getProgressStatus(usage)}
          />
        ),
      },
      {
        title: '内存使用率',
        dataIndex: 'memoryUsage',
        key: 'memoryUsage',
        width: 150,
        render: (usage: number) => (
          <Progress
            percent={Math.round(usage)}
            size="small"
            status={getProgressStatus(usage)}
          />
        ),
      },
      {
        title: '费用 (¥)',
        dataIndex: 'cost',
        key: 'cost',
        width: 120,
        align: 'right',
        sorter: (a, b) => a.cost - b.cost,
        render: (cost: number) => <span style={{ fontWeight: 500 }}>¥{cost.toFixed(2)}</span>,
      },
    ],
    []
  );
};

interface UseUserTableSummaryProps {
  data: UserMetering[];
}

export const useUserTableSummary = ({ data }: UseUserTableSummaryProps) => {
  return useMemo(
    () => () => {
      const totalHours = data.reduce((sum, item) => sum + item.totalHours, 0);
      const totalCost = data.reduce((sum, item) => sum + item.cost, 0);
      return (
        <Table.Summary fixed>
          <Table.Summary.Row>
            <Table.Summary.Cell index={0}>
              <strong>合计</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1}>-</Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right">
              <strong>{totalHours.toFixed(2)}</strong>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3}>-</Table.Summary.Cell>
            <Table.Summary.Cell index={4}>-</Table.Summary.Cell>
            <Table.Summary.Cell index={5}>-</Table.Summary.Cell>
            <Table.Summary.Cell index={6} align="right">
              <strong style={{ color: '#1890ff' }}>¥{totalCost.toFixed(2)}</strong>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        </Table.Summary>
      );
    },
    [data]
  );
};
