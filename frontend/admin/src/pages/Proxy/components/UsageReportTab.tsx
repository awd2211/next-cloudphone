import { useState } from 'react';
import {
  Table,
  DatePicker,
  Button,
  Space,
  Card,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  ReloadOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useProxyUsageReport } from '@/hooks/queries/useProxy';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { RangePicker } = DatePicker;

// 本地类型定义（匹配组件期望的数据结构）
interface UsageReport {
  timeRange: {
    start: string;
    end: string;
  };
  overview: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: number;
    totalBandwidth: number;
    uniqueDevices: number;
    uniqueUsers: number;
  };
  topDevices: Array<{
    deviceId: string;
    deviceName: string;
    requests: number;
    bandwidth: number;
    successRate: number;
  }>;
  topUsers: Array<{
    userId: string;
    username: string;
    requests: number;
    bandwidth: number;
    cost: number;
  }>;
}

/**
 * 使用报告与审计标签页
 *
 * 功能：
 * - 使用统计报告
 * - 设备使用排名
 * - 用户使用排名
 */
const UsageReportTab: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);

  // 使用新的 React Query Hook
  const { data, isLoading, refetch } = useProxyUsageReport({
    startDate: dateRange[0].toISOString(),
    endDate: dateRange[1].toISOString(),
  });

  // 类型断言：假设 API 返回的数据符合组件期望的结构
  const usageReport = data as unknown as UsageReport | undefined;

  const deviceColumns: ColumnsType<UsageReport['topDevices'][0]> = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      render: (_, __, index) => `#${index + 1}`,
    },
    {
      title: '设备',
      key: 'device',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.deviceName}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.deviceId}</div>
        </div>
      ),
    },
    {
      title: '请求数',
      dataIndex: 'requests',
      key: 'requests',
      width: 120,
      sorter: (a, b) => a.requests - b.requests,
    },
    {
      title: '流量',
      dataIndex: 'bandwidth',
      key: 'bandwidth',
      width: 120,
      sorter: (a, b) => a.bandwidth - b.bandwidth,
      render: (bandwidth: number) => `${bandwidth.toFixed(2)} GB`,
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      width: 100,
      sorter: (a, b) => a.successRate - b.successRate,
      render: (rate: number) => `${rate.toFixed(1)}%`,
    },
  ];

  const userColumns: ColumnsType<UsageReport['topUsers'][0]> = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      render: (_, __, index) => `#${index + 1}`,
    },
    {
      title: '用户',
      key: 'user',
      width: 200,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.username}</div>
          <div style={{ fontSize: 12, color: '#999' }}>{record.userId}</div>
        </div>
      ),
    },
    {
      title: '请求数',
      dataIndex: 'requests',
      key: 'requests',
      width: 120,
      sorter: (a, b) => a.requests - b.requests,
    },
    {
      title: '流量',
      dataIndex: 'bandwidth',
      key: 'bandwidth',
      width: 120,
      sorter: (a, b) => a.bandwidth - b.bandwidth,
      render: (bandwidth: number) => `${bandwidth.toFixed(2)} GB`,
    },
    {
      title: '成本',
      dataIndex: 'cost',
      key: 'cost',
      width: 100,
      sorter: (a, b) => a.cost - b.cost,
      render: (cost: number) => `$${cost.toFixed(2)}`,
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

      {/* 使用总览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总请求数"
              value={usageReport?.overview.totalRequests || 0}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="成功请求"
              value={usageReport?.overview.successfulRequests || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="失败请求"
              value={usageReport?.overview.failedRequests || 0}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="成功率"
              value={usageReport?.overview.successRate.toFixed(1) || 0}
              suffix="%"
              valueStyle={{
                color:
                  (usageReport?.overview.successRate || 0) >= 90
                    ? '#3f8600'
                    : (usageReport?.overview.successRate || 0) >= 70
                    ? '#faad14'
                    : '#cf1322',
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总流量"
              value={usageReport?.overview.totalBandwidth.toFixed(2) || 0}
              suffix="GB"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃设备数"
              value={usageReport?.overview.uniqueDevices || 0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃用户数"
              value={usageReport?.overview.uniqueUsers || 0}
            />
          </Card>
        </Col>
      </Row>

      {/* 设备使用排名 */}
      <Card title="设备使用排名 TOP 10" style={{ marginBottom: 16 }}>
        <Table
          columns={deviceColumns}
          dataSource={usageReport?.topDevices || []}
          rowKey="deviceId"
          loading={isLoading}
          pagination={false}
        />
      </Card>

      {/* 用户使用排名 */}
      <Card title="用户使用排名 TOP 10">
        <Table
          columns={userColumns}
          dataSource={usageReport?.topUsers || []}
          rowKey="userId"
          loading={isLoading}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default UsageReportTab;
