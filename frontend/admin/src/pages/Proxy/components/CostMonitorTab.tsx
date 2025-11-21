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
  theme,
} from 'antd';
import {
  DollarOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useProxyCostReport } from '@/hooks/queries/useProxy';
import dayjs, { Dayjs } from 'dayjs';
import type { ColumnsType } from 'antd/es/table';

const { RangePicker } = DatePicker;

// 本地类型定义（匹配组件期望的数据结构）
interface CostReport {
  timeRange: {
    start: string;
    end: string;
  };
  overview: {
    totalCost: number;
    totalBandwidth: number;
    avgCostPerGB: number;
    avgCostPerRequest: number;
    projectedMonthlyCost: number;
  };
  byProvider: Array<{
    provider: string;
    totalCost: number;
    bandwidth: number;
    requests: number;
    avgCostPerGB: number;
    percentage: number;
  }>;
  byDeviceGroup: Array<{
    groupId: string;
    groupName: string;
    totalCost: number;
    bandwidth: number;
    requests: number;
  }>;
}

/**
 * 成本监控与分析标签页
 *
 * 功能：
 * - 成本统计与趋势
 * - 按供应商成本分析
 * - 按设备组成本分析
 * - 成本优化建议
 */
const CostMonitorTab: React.FC = () => {
  const { token } = theme.useToken();
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(7, 'day'),
    dayjs(),
  ]);

  // 使用新的 React Query Hook
  const { data, isLoading, refetch } = useProxyCostReport({
    startDate: dateRange[0].toISOString(),
    endDate: dateRange[1].toISOString(),
  });

  // 类型断言：假设 API 返回的数据符合组件期望的结构
  const costReport = data as unknown as CostReport | undefined;

  const providerColumns: ColumnsType<CostReport['byProvider'][0]> = [
    {
      title: '供应商',
      dataIndex: 'provider',
      key: 'provider',
      width: 150,
    },
    {
      title: '总成本',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      sorter: (a, b) => a.totalCost - b.totalCost,
      render: (cost: number) => `$${cost.toFixed(2)}`,
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
      title: '请求数',
      dataIndex: 'requests',
      key: 'requests',
      width: 100,
      sorter: (a, b) => a.requests - b.requests,
    },
    {
      title: '平均成本',
      dataIndex: 'avgCostPerGB',
      key: 'avgCostPerGB',
      width: 120,
      sorter: (a, b) => a.avgCostPerGB - b.avgCostPerGB,
      render: (cost: number) => `$${cost.toFixed(2)}/GB`,
    },
    {
      title: '占比',
      dataIndex: 'percentage',
      key: 'percentage',
      width: 100,
      render: (percentage: number) => `${percentage.toFixed(1)}%`,
    },
  ];

  const deviceGroupColumns: ColumnsType<CostReport['byDeviceGroup'][0]> = [
    {
      title: '设备组',
      dataIndex: 'groupName',
      key: 'groupName',
      width: 150,
    },
    {
      title: '总成本',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      sorter: (a, b) => a.totalCost - b.totalCost,
      render: (cost: number) => `$${cost.toFixed(2)}`,
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
      title: '请求数',
      dataIndex: 'requests',
      key: 'requests',
      width: 100,
      sorter: (a, b) => a.requests - b.requests,
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

      {/* 成本总览 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="总成本"
              value={costReport?.overview.totalCost.toFixed(2) || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: token.colorPrimary }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="总流量"
              value={costReport?.overview.totalBandwidth.toFixed(2) || 0}
              suffix="GB"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="平均成本/GB"
              value={costReport?.overview.avgCostPerGB.toFixed(2) || 0}
              prefix="$"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="平均成本/请求"
              value={costReport?.overview.avgCostPerRequest.toFixed(4) || 0}
              prefix="$"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card>
            <Statistic
              title="预计月度成本"
              value={costReport?.overview.projectedMonthlyCost.toFixed(2) || 0}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 按供应商成本分析 */}
      <Card title="按供应商成本分析" style={{ marginBottom: 16 }}>
        <Table
          columns={providerColumns}
          dataSource={costReport?.byProvider || []}
          rowKey="provider"
          loading={isLoading}
          pagination={false}
        />
      </Card>

      {/* 按设备组成本分析 */}
      <Card title="按设备组成本分析">
        <Table
          columns={deviceGroupColumns}
          dataSource={costReport?.byDeviceGroup || []}
          rowKey="groupId"
          loading={isLoading}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default CostMonitorTab;
