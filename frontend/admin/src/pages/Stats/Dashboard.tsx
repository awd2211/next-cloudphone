import React from 'react';
import { Card, Row, Col } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
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
import {
  StatsOverviewCards,
  TimeRangeFilter,
  useTopAppsTableColumns,
  CHART_COLORS,
} from '@/components/StatsDashboard';
import { useStatsDashboard } from '@/hooks/useStatsDashboard';

interface TopApp {
  id: string;
  rank: number;
  name: string;
  installCount: number;
  activeDevices: number;
}

const StatsDashboard: React.FC = () => {
  const {
    timeRange,
    setTimeRange,
    setDateRange,
    overview,
    overviewLoading,
    trends,
    trendsLoading,
    userGrowth,
    deviceUsage,
    revenue,
    topApps,
  } = useStatsDashboard();

  const topAppsColumns = useTopAppsTableColumns();

  return (
    <div>
      <TimeRangeFilter
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onDateRangeChange={setDateRange}
      />

      <StatsOverviewCards overview={overview} loading={overviewLoading} />

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
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
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
        <AccessibleTable<TopApp>
          ariaLabel="热门应用列表"
          loadingText="正在加载热门应用数据"
          emptyText="暂无热门应用数据"
          columns={topAppsColumns}
          dataSource={topApps?.data || []}
          rowKey="id"
          pagination={false}
          scroll={{ y: 400 }}
          virtual
        />
      </Card>
    </div>
  );
};

export default StatsDashboard;
