import React, { useEffect, useCallback } from 'react';
import { Card, Row, Col, Tag, message } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
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
import { useStatsDashboard } from '@/hooks/queries/useStatsDashboard';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';

// 确保数据是数组的辅助函数
const ensureArray = <T,>(data: T[] | undefined | null | unknown): T[] => {
  if (Array.isArray(data)) return data;
  return [];
};

interface TopApp {
  id: string;
  rank: number;
  name: string;
  installCount: number;
  activeDevices: number;
}

/**
 * 统计仪表盘页面 (优化版)
 *
 * 优化策略:
 * 1. ErrorBoundary - 包裹整个页面，防止图表错误导致页面崩溃
 * 2. LoadingState - 统一加载状态管理
 * 3. 快捷键支持 - Ctrl+R 刷新数据
 * 4. 页面标题优化 - 显示刷新状态和快捷键提示
 * 5. 错误边界分离 - 每个图表独立 ErrorBoundary
 */
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
    refetchAll,
    isLoading,
  } = useStatsDashboard();

  const topAppsColumns = useTopAppsTableColumns();

  // ===== 刷新回调 =====
  const handleRefresh = useCallback(async () => {
    message.loading({ content: '正在刷新...', key: 'stats-refresh' });
    try {
      await refetchAll();
      message.success({ content: '刷新成功', key: 'stats-refresh' });
    } catch {
      message.error({ content: '刷新失败', key: 'stats-refresh' });
    }
  }, [refetchAll]);

  // ===== 快捷键支持 =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+R 或 Cmd+R 刷新数据
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefresh]);

  return (
    <ErrorBoundary boundaryName="StatsDashboard">
      <div>
        {/* 页面标题和刷新提示 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ marginBottom: 0 }}>
            统计仪表盘
            <Tag
              icon={<ReloadOutlined spin={isLoading} />}
              color="processing"
              style={{ marginLeft: 12, cursor: 'pointer' }}
              onClick={handleRefresh}
            >
              Ctrl+R 刷新
            </Tag>
          </h2>
        </div>

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
              <ErrorBoundary boundaryName="UserGrowthChart">
                <LoadingState loading={trendsLoading} loadingType="skeleton" skeletonRows={5}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={ensureArray(userGrowth?.data)}>
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
                </LoadingState>
              </ErrorBoundary>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="设备使用趋势" loading={trendsLoading}>
              <ErrorBoundary boundaryName="DeviceTrendChart">
                <LoadingState loading={trendsLoading} loadingType="skeleton" skeletonRows={5}>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={ensureArray(trends?.deviceTrends)}>
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
                </LoadingState>
              </ErrorBoundary>
            </Card>
          </Col>
        </Row>

        {/* 收入和设备状态 */}
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card title="收入统计">
              <ErrorBoundary boundaryName="RevenueChart">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ensureArray(revenue?.data)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name="收入" />
                    <Bar dataKey="orders" fill="#82ca9d" name="订单数" />
                  </BarChart>
                </ResponsiveContainer>
              </ErrorBoundary>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="设备状态分布">
              <ErrorBoundary boundaryName="DeviceStatusChart">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={ensureArray(deviceUsage?.statusDistribution)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {ensureArray(deviceUsage?.statusDistribution).map(
                        (_entry: unknown, index: number) => (
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
              </ErrorBoundary>
            </Card>
          </Col>
        </Row>

        {/* 热门应用 */}
        <Card title="热门应用 Top 10">
          <ErrorBoundary boundaryName="TopAppsTable">
            <AccessibleTable<TopApp>
              ariaLabel="热门应用列表"
              loadingText="正在加载热门应用数据"
              emptyText="暂无热门应用数据"
              columns={topAppsColumns}
              dataSource={ensureArray(topApps?.data) as TopApp[]}
              rowKey="id"
              pagination={false}
              scroll={{ y: 400 }}
              virtual
            />
          </ErrorBoundary>
        </Card>
      </div>
    </ErrorBoundary>
  );
};

export default StatsDashboard;
