import { useState, useEffect } from 'react';
import { Table, Input, DatePicker, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getUsageRecords } from '@/services/billing';
import type { UsageRecord } from '@/types';
import dayjs from 'dayjs';

const { Search } = Input;
const { RangePicker } = DatePicker;

const UsageList = () => {
  const [usageRecords, setUsageRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [userIdFilter, setUserIdFilter] = useState<string>();
  const [deviceIdFilter, setDeviceIdFilter] = useState<string>();

  const loadUsageRecords = async () => {
    setLoading(true);
    try {
      const res = await getUsageRecords({
        page,
        pageSize,
        userId: userIdFilter,
        deviceId: deviceIdFilter,
      });
      setUsageRecords(res.data);
      setTotal(res.total);
    } catch (error) {
      message.error('加载使用记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsageRecords();
  }, [page, pageSize, userIdFilter, deviceIdFilter]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const columns: ColumnsType<UsageRecord> = [
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
      render: (usage: number) => usage ? `${usage.toFixed(2)}%` : '-',
    },
    {
      title: '内存使用',
      dataIndex: 'memoryUsage',
      key: 'memoryUsage',
      render: (usage: number) => usage ? `${(usage / 1024).toFixed(2)} GB` : '-',
    },
    {
      title: '流量使用',
      dataIndex: 'networkUsage',
      key: 'networkUsage',
      render: (usage: number) => usage ? `${(usage / 1024 / 1024).toFixed(2)} MB` : '-',
    },
    {
      title: '费用',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost: number) => `¥${cost.toFixed(2)}`,
    },
  ];

  return (
    <div>
      <h2>使用记录</h2>

      <div style={{ marginBottom: 16, display: 'flex', gap: 16 }}>
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
      </div>

      <Table
        columns={columns}
        dataSource={usageRecords}
        rowKey="id"
        loading={loading}
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
    </div>
  );
};

export default UsageList;
