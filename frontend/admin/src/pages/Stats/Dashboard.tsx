import React, { useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Select,
  DatePicker,
  Space,
  Spin,
  Typography,
} from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  UserOutlined,
  MobileOutlined,
  AppstoreOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const { RangePicker } = DatePicker;
const { Title } = Typography;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const StatsDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<string>('7d');
  const [dateRange, setDateRange] = useState<any>(null);

  // 获取概览统计
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['stats-overview'],
    queryFn: async () => {
      const response = await request.get('/stats/overview');
      return response;
    },
  });

  // 获取趋势数据
  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['stats-trends', timeRange, dateRange],
    queryFn: async () => {
      const params: any = { range: timeRange };
      if (dateRange) {
        params.startDate = dateRange[0].toISOString();
        params.endDate = dateRange[1].toISOString();
      }
      const response = await request.get('/stats/trends', { params });
      return response;
    },
  });

  // 获取用户增长数据
  const { data: userGrowth } = useQuery({
    queryKey: ['stats-user-growth', timeRange],
    queryFn: async () => {
      const response = await request.get('/stats/user-growth', {
        params: { range: timeRange },
      });
      return response;
    },
  });

  // 获取设备使用情况
  const { data: deviceUsage } = useQuery({
    queryKey: ['stats-device-usage'],
    queryFn: async () => {
      const response = await request.get('/stats/device-usage');
      return response;
    },
  });

  // 获取收入统计
  const { data: revenue } = useQuery({
    queryKey: ['stats-revenue', timeRange],
    queryFn: async () => {
      const response = await request.get('/stats/revenue', {
        params: { range: timeRange },
      });
      return response;
    },
  });

  // 获取热门应用
  const { data: topApps } = useQuery({
    queryKey: ['stats-top-apps'],
    queryFn: async () => {
      const response = await request.get('/stats/top-apps', {
        params: { limit: 10 },
      });
      return response;
    },
  });

  const topAppsColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
    },
    {
      title: '应用名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '安装次数',
      dataIndex: 'installCount',
      key: 'installCount',
      sorter: (a: any, b: any) => a.installCount - b.installCount,
    },
    {
      title: '活跃设备',
      dataIndex: 'activeDevices',
      key: 'activeDevices',
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Select
            value={timeRange}
            onChange={setTimeRange}
            style={{ width: 120 }}
          >
            <Select.Option value="24h">最近24小时</Select.Option>
            <Select.Option value="7d">最近7天</Select.Option>
            <Select.Option value="30d">最近30天</Select.Option>
            <Select.Option value="90d">最近90天</Select.Option>
          </Select>
          <RangePicker onChange={setDateRange} />
        </Space>
      </div>

      {/* 核心指标卡片 */}
      <Spin spinning={overviewLoading}>
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总用户数"
                value={overview?.totalUsers || 0}
                prefix={<UserOutlined />}
                suffix={
                  overview?.userGrowthRate && (
                    <span
                      style={{
                        fontSize: 14,
                        color:
                          overview.userGrowthRate > 0 ? '#3f8600' : '#cf1322',
                      }}
                    >
                      {overview.userGrowthRate > 0 ? (
                        <ArrowUpOutlined />
                      ) : (
                        <ArrowDownOutlined />
                      )}
                      {Math.abs(overview.userGrowthRate)}%
                    </span>
                  )
                }
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="活跃设备"
                value={overview?.activeDevices || 0}
                prefix={<MobileOutlined />}
                suffix={
                  overview?.deviceGrowthRate && (
                    <span
                      style={{
                        fontSize: 14,
                        color:
                          overview.deviceGrowthRate > 0 ? '#3f8600' : '#cf1322',
                      }}
                    >
                      {overview.deviceGrowthRate > 0 ? (
                        <ArrowUpOutlined />
                      ) : (
                        <ArrowDownOutlined />
                      )}
                      {Math.abs(overview.deviceGrowthRate)}%
                    </span>
                  )
                }
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="应用总数"
                value={overview?.totalApps || 0}
                prefix={<AppstoreOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="本月收入"
                value={overview?.monthlyRevenue || 0}
                prefix={<DollarOutlined />}
                precision={2}
                suffix="¥"
              />
            </Card>
          </Col>
        </Row>
      </Spin>

      {/* 趋势图表 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="用户增长趋势" loading={trendsLoading}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowth?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="newUsers"
                  stroke="#8884d8"
                  name="新增用户"
                />
                <Line
                  type="monotone"
                  dataKey="totalUsers"
                  stroke="#82ca9d"
                  name="累计用户"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="设备使用趋势" loading={trendsLoading}>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trends?.deviceTrends || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="active"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  name="活跃"
                />
                <Area
                  type="monotone"
                  dataKey="idle"
                  stackId="1"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  name="空闲"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 收入和设备状态 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card title="收入统计">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenue?.data || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="revenue" fill="#8884d8" name="收入" />
                <Bar dataKey="orders" fill="#82ca9d" name="订单数" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="设备状态分布">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deviceUsage?.statusDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(deviceUsage?.statusDistribution || []).map(
                    (_entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    )
                  )}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 热门应用 */}
      <Card title="热门应用 Top 10">
        <Table
          columns={topAppsColumns}
          dataSource={topApps?.data || []}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default StatsDashboard;

