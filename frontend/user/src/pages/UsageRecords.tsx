import { useState, useEffect } from 'react';
import { Card, Table, Tag, DatePicker, Button, Row, Col } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { RangePickerProps } from 'antd/es/date-picker';
import { getUsageRecords } from '@/services/order';
import type { UsageRecord } from '@/types';
import dayjs, { Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

const UsageRecords = () => {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const res = await getUsageRecords({
        page,
        pageSize,
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
      });
      setRecords(res.data);
      setTotal(res.total);
    } catch (error) {
      console.error('加载使用记录失败', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [page, pageSize]);

  const handleDateChange: RangePickerProps['onChange'] = (dates) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}时${minutes}分${secs}秒`;
  };

  const columns: ColumnsType<UsageRecord> = [
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
      render: (time: string) => dayjs(time).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (time?: string) =>
        time ? dayjs(time).format('YYYY-MM-DD HH:mm:ss') : <Tag color="green">使用中</Tag>,
    },
    {
      title: '使用时长',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => formatDuration(duration),
    },
    {
      title: 'CPU 使用',
      dataIndex: 'cpuUsage',
      key: 'cpuUsage',
      render: (usage?: number) => (usage ? `${usage.toFixed(1)}%` : '-'),
    },
    {
      title: '内存使用',
      dataIndex: 'memoryUsage',
      key: 'memoryUsage',
      render: (usage?: number) => (usage ? `${(usage / 1024).toFixed(2)} MB` : '-'),
    },
    {
      title: '流量使用',
      dataIndex: 'networkUsage',
      key: 'networkUsage',
      render: (usage?: number) => (usage ? `${(usage / 1024 / 1024).toFixed(2)} MB` : '-'),
    },
    {
      title: '费用',
      dataIndex: 'cost',
      key: 'cost',
      render: (cost: number) => <span style={{ color: '#f5222d' }}>¥{cost.toFixed(2)}</span>,
    },
  ];

  return (
    <div>
      <h2>使用记录</h2>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col>
            <span style={{ marginRight: 8 }}>时间范围：</span>
            <RangePicker
              value={dateRange}
              onChange={handleDateChange}
              format="YYYY-MM-DD"
              presets={[
                { label: '最近7天', value: [dayjs().subtract(7, 'day'), dayjs()] },
                { label: '最近30天', value: [dayjs().subtract(30, 'day'), dayjs()] },
                { label: '最近90天', value: [dayjs().subtract(90, 'day'), dayjs()] },
              ]}
            />
          </Col>
          <Col>
            <Button type="primary" onClick={() => setPage(1)}>
              查询
            </Button>
          </Col>
        </Row>
      </Card>

      <Card>
        <Table
          columns={columns}
          dataSource={records}
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
          scroll={{ x: 1200 }}
        />
      </Card>
    </div>
  );
};

export default UsageRecords;
