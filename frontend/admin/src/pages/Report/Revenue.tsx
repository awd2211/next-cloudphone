import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, DatePicker, Button, message, Table } from 'antd';
import { DownloadOutlined, DollarOutlined, ShoppingOutlined } from '@ant-design/icons';
import { getRevenueStats, exportRevenueReport } from '@/services/billing';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

interface DailyStats {
  date: string;
  revenue: number;
  orders: number;
}

interface PlanStats {
  planId: string;
  planName: string;
  revenue: number;
  orders: number;
}

const RevenueReport = () => {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [planStats, setPlanStats] = useState<PlanStats[]>([]);

  const loadRevenueStats = async () => {
    setLoading(true);
    try {
      const data = await getRevenueStats(
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD')
      );
      setTotalRevenue(data.totalRevenue);
      setTotalOrders(data.totalOrders);
      setAvgOrderValue(data.avgOrderValue);
      setDailyStats(data.dailyStats || []);
      setPlanStats(data.planStats || []);
    } catch (error) {
      message.error('加载收入统计失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRevenueStats();
  }, [dateRange]);

  const handleExport = async (format: 'excel' | 'csv') => {
    try {
      const blob = await exportRevenueReport(
        dateRange[0].format('YYYY-MM-DD'),
        dateRange[1].format('YYYY-MM-DD'),
        format
      );
      const url = window.URL.createObjectURL(blob as any);
      const link = document.createElement('a');
      link.href = url;
      link.download = `revenue_report_${dayjs().format('YYYYMMDD')}.${format === 'excel' ? 'xlsx' : 'csv'}`;
      link.click();
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      message.error('导出失败');
    }
  };

  const dailyColumns: ColumnsType<DailyStats> = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: '收入',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (revenue: number) => `¥${revenue.toFixed(2)}`,
      sorter: (a, b) => a.revenue - b.revenue,
    },
    {
      title: '订单数',
      dataIndex: 'orders',
      key: 'orders',
      sorter: (a, b) => a.orders - b.orders,
    },
  ];

  const planColumns: ColumnsType<PlanStats> = [
    {
      title: '套餐名称',
      dataIndex: 'planName',
      key: 'planName',
    },
    {
      title: '收入',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (revenue: number) => `¥${revenue.toFixed(2)}`,
      sorter: (a, b) => a.revenue - b.revenue,
    },
    {
      title: '订单数',
      dataIndex: 'orders',
      key: 'orders',
      sorter: (a, b) => a.orders - b.orders,
    },
    {
      title: '占比',
      key: 'percentage',
      render: (_, record) => {
        const percentage = totalRevenue > 0 ? (record.revenue / totalRevenue * 100).toFixed(2) : 0;
        return `${percentage}%`;
      },
    },
  ];

  return (
    <div>
      <h2>收入统计报表</h2>

      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <RangePicker
          value={dateRange}
          onChange={(dates) => dates && setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs])}
          format="YYYY-MM-DD"
        />
        <div>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleExport('excel')}
            style={{ marginRight: 8 }}
          >
            导出 Excel
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => handleExport('csv')}
          >
            导出 CSV
          </Button>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="总收入"
              value={totalRevenue}
              prefix="¥"
              precision={2}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="总订单数"
              value={totalOrders}
              prefix={<ShoppingOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card loading={loading}>
            <Statistic
              title="平均订单价值"
              value={avgOrderValue}
              prefix="¥"
              precision={2}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="每日收入统计" style={{ marginBottom: 24 }}>
        <Table
          columns={dailyColumns}
          dataSource={dailyStats}
          rowKey="date"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Card title="套餐收入统计">
        <Table
          columns={planColumns}
          dataSource={planStats}
          rowKey="planId"
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default RevenueReport;
