import { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  DatePicker,
  Button,
  Space,
  Table,
  Tag,
  theme,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useSMSStatistics } from '@/hooks/queries/useSMS';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { RangePicker } = DatePicker;

interface StatisticsData {
  timeRange: {
    start: string;
    end: string;
  };
  overview: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    averageCost: number;
    totalCost: number;
  };
  providerStats: Array<{
    provider: string;
    requests: number;
    successes: number;
    failures: number;
    successRate: number;
    averageResponseTime: number;
    averageCost: number;
    totalCost: number;
    healthStatus: string;
  }>;
  serviceStats: Array<{
    service: string;
    requests: number;
    averageSmsReceiveTime: number;
    averageCost: number;
  }>;
}

/**
 * 统计分析标签页
 *
 * 功能：
 * - 历史数据统计分析
 * - 时间范围筛选
 * - 平台性能对比
 * - 服务使用分析
 */
const StatisticsTab: React.FC = () => {
  const { token } = theme.useToken();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);

  // 使用新的 React Query Hook
  const { data, isLoading, refetch } = useSMSStatistics({
    startDate: dateRange[0].toISOString(),
    endDate: dateRange[1].toISOString(),
  });

  // 类型断言：假设 API 返回的数据符合组件期望的结构
  const statisticsData = data as unknown as StatisticsData | undefined;

  const providerColumns: ColumnsType<StatisticsData['providerStats'][0]> = [
    {
      title: '平台',
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
    },
    {
      title: '请求数',
      dataIndex: 'requests',
      key: 'requests',
      width: 100,
      sorter: (a, b) => a.requests - b.requests,
    },
    {
      title: '成功数',
      dataIndex: 'successes',
      key: 'successes',
      width: 100,
      render: (value) => <span style={{ color: '#52c41a' }}>{value}</span>,
    },
    {
      title: '失败数',
      dataIndex: 'failures',
      key: 'failures',
      width: 100,
      render: (value) => <span style={{ color: '#ff4d4f' }}>{value}</span>,
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      width: 100,
      sorter: (a, b) => a.successRate - b.successRate,
      render: (rate) => `${rate.toFixed(1)}%`,
    },
    {
      title: '平均响应时间',
      dataIndex: 'averageResponseTime',
      key: 'averageResponseTime',
      width: 120,
      sorter: (a, b) => a.averageResponseTime - b.averageResponseTime,
      render: (time) => `${time.toFixed(1)}s`,
    },
    {
      title: '平均成本',
      dataIndex: 'averageCost',
      key: 'averageCost',
      width: 100,
      sorter: (a, b) => a.averageCost - b.averageCost,
      render: (cost) => `$${cost.toFixed(4)}`,
    },
    {
      title: '总成本',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 100,
      sorter: (a, b) => a.totalCost - b.totalCost,
      render: (cost) => `$${cost.toFixed(4)}`,
    },
    {
      title: '健康状态',
      dataIndex: 'healthStatus',
      key: 'healthStatus',
      width: 100,
      render: (status) => (
        <Tag color={status === 'healthy' ? 'success' : 'default'}>
          {status === 'healthy' ? '健康' : '未知'}
        </Tag>
      ),
    },
  ];

  const serviceColumns: ColumnsType<StatisticsData['serviceStats'][0]> = [
    {
      title: '服务代码',
      dataIndex: 'service',
      key: 'service',
      width: 150,
    },
    {
      title: '请求数',
      dataIndex: 'requests',
      key: 'requests',
      width: 120,
      sorter: (a, b) => a.requests - b.requests,
    },
    {
      title: '平均接收时间',
      dataIndex: 'averageSmsReceiveTime',
      key: 'averageSmsReceiveTime',
      width: 150,
      sorter: (a, b) => a.averageSmsReceiveTime - b.averageSmsReceiveTime,
      render: (time) => `${time.toFixed(1)}s`,
    },
    {
      title: '平均成本',
      dataIndex: 'averageCost',
      key: 'averageCost',
      width: 120,
      sorter: (a, b) => a.averageCost - b.averageCost,
      render: (cost) => `$${cost.toFixed(4)}`,
    },
  ];

  return (
    <div>
      {/* 时间范围选择 */}
      <div style={{ marginBottom: 24 }}>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={(dates) => {
              if (dates) {
                setDateRange([dates[0]!, dates[1]!]);
              }
            }}
            showTime
            format="YYYY-MM-DD HH:mm"
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
          >
            刷新
          </Button>
          <Button
            onClick={() =>
              setDateRange([dayjs().subtract(24, 'hour'), dayjs()])
            }
          >
            最近24小时
          </Button>
          <Button
            onClick={() => setDateRange([dayjs().subtract(7, 'day'), dayjs()])}
          >
            最近7天
          </Button>
          <Button
            onClick={() => setDateRange([dayjs().subtract(30, 'day'), dayjs()])}
          >
            最近30天
          </Button>
        </Space>
      </div>

      {/* 总览统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总请求数"
              value={statisticsData?.overview.totalRequests || 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="成功请求"
              value={statisticsData?.overview.successfulRequests || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="失败请求"
              value={statisticsData?.overview.failedRequests || 0}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="成功率"
              value={statisticsData?.overview.successRate.toFixed(1) || 0}
              suffix="%"
              valueStyle={{
                color:
                  (statisticsData?.overview.successRate || 0) >= 90
                    ? '#3f8600'
                    : (statisticsData?.overview.successRate || 0) >= 70
                    ? '#faad14'
                    : '#cf1322',
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均成本"
              value={statisticsData?.overview.averageCost.toFixed(4) || 0}
              prefix="$"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总成本"
              value={statisticsData?.overview.totalCost.toFixed(4) || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: token.colorPrimary }}
            />
          </Card>
        </Col>
      </Row>

      {/* 平台统计表格 */}
      <Card title="平台性能统计" style={{ marginBottom: 16 }}>
        <Table
          columns={providerColumns}
          dataSource={statisticsData?.providerStats || []}
          rowKey="provider"
          loading={isLoading}
          pagination={false}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 服务统计表格 */}
      <Card title="服务使用统计">
        <Table
          columns={serviceColumns}
          dataSource={statisticsData?.serviceStats || []}
          rowKey="service"
          loading={isLoading}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default StatisticsTab;
