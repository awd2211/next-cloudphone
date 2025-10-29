import { useState, useMemo, useCallback } from 'react';
import { Table, Input, Card, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useUsageRecords } from '@/hooks/useUsage';
import type { UsageRecord } from '@/types';
import dayjs from 'dayjs';

const { Search } = Input;

const UsageList = () => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [userIdFilter, setUserIdFilter] = useState<string>();
  const [deviceIdFilter, setDeviceIdFilter] = useState<string>();

  // React Query hooks
  const params = useMemo(
    () => ({
      page,
      pageSize,
      userId: userIdFilter,
      deviceId: deviceIdFilter,
    }),
    [page, pageSize, userIdFilter, deviceIdFilter]
  );

  const { data, isLoading } = useUsageRecords(params);
  const usageRecords = data?.data || [];
  const total = data?.total || 0;

  // Optimized utility functions
  const formatDuration = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  }, []);

  const formatMemory = useCallback((usage: number) => {
    return usage ? `${((usage || 0) / 1024).toFixed(2)} GB` : '-';
  }, []);

  const formatNetwork = useCallback((usage: number) => {
    return usage ? `${((usage || 0) / 1024 / 1024).toFixed(2)} MB` : '-';
  }, []);

  const formatCost = useCallback((cost: number) => {
    return `¥${(cost || 0).toFixed(2)}`;
  }, []);

  const formatCpuUsage = useCallback((usage: number) => {
    return usage ? `${(usage || 0).toFixed(2)}%` : '-';
  }, []);

  const columns: ColumnsType<UsageRecord> = useMemo(() => [
    {
      title: '记录 ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      ellipsis: true,
    },
    {
      title: '用户 ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 120,
      ellipsis: true,
    },
    {
      title: '设备 ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      width: 120,
      ellipsis: true,
    },
    {
      title: '设备名称',
      dataIndex: 'device',
      key: 'device',
      render: (device: any) => device?.name || '-',
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (date: string) => date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '使用中',
    },
    {
      title: '使用时长',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => formatDuration(duration),
    },
    {
      title: 'CPU 使用率',
      dataIndex: 'cpuUsage',
      key: 'cpuUsage',
      render: formatCpuUsage,
      sorter: (a, b) => (a.cpuUsage || 0) - (b.cpuUsage || 0),
    },
    {
      title: '内存使用',
      dataIndex: 'memoryUsage',
      key: 'memoryUsage',
      render: formatMemory,
      sorter: (a, b) => (a.memoryUsage || 0) - (b.memoryUsage || 0),
    },
    {
      title: '流量使用',
      dataIndex: 'networkUsage',
      key: 'networkUsage',
      render: formatNetwork,
      sorter: (a, b) => (a.networkUsage || 0) - (b.networkUsage || 0),
    },
    {
      title: '费用',
      dataIndex: 'cost',
      key: 'cost',
      render: formatCost,
      sorter: (a, b) => (a.cost || 0) - (b.cost || 0),
    },
  ], [formatDuration, formatCpuUsage, formatMemory, formatNetwork, formatCost]);

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <h2 style={{ margin: 0 }}>使用记录</h2>
        </Card>

        <Card>
          <Space size="middle">
            <Search
              placeholder="用户 ID"
              style={{ width: 200 }}
              onSearch={(value) => setUserIdFilter(value || undefined)}
              allowClear
            />
            <Search
              placeholder="设备 ID"
              style={{ width: 200 }}
              onSearch={(value) => setDeviceIdFilter(value || undefined)}
              allowClear
            />
          </Space>
        </Card>

        <Card>
          <Table
            columns={columns}
            dataSource={usageRecords}
            rowKey="id"
            loading={isLoading}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
              onChange: (page, pageSize) => {
                setPage(page);
                setPageSize(pageSize);
              },
            }}
            scroll={{ x: 1600 }}
          />
        </Card>
      </Space>
    </div>
  );
};

export default UsageList;
