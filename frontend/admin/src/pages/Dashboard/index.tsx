import { Row, Col, Card, Tag, theme } from 'antd';
import {
  MobileOutlined,
  UserOutlined,
  AppstoreOutlined,
  CloudServerOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import {
  RevenueChartLazy,
  DeviceStatusChartLazy,
  UserGrowthChartLazy,
  PlanDistributionChartLazy,
} from '@/components/LazyComponents';
import { useRole, RoleGuard } from '@/hooks/useRole';
import { useDashboard } from '@/hooks/useDashboard';
import { StatCard, DataErrorAlert } from '@/components/Dashboard';

const Dashboard = () => {
  const { isAdmin, roleDisplayName, roleColor } = useRole();
  const { token } = theme.useToken();
  const {
    stats,
    statsLoading,
    hasStatsError,
    revenueData,
    deviceStatusData,
    userGrowthData,
    planDistributionData,
    chartsLoading,
    hasChartsError,
    loadStats,
    loadChartData,
  } = useDashboard();

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <h2 style={{ marginBottom: 0 }}>仪表盘</h2>
        <Tag color={roleColor}>{roleDisplayName}</Tag>
      </div>

      {/* 统计数据错误提示 */}
      {hasStatsError && (
        <DataErrorAlert
          title="加载统计数据失败"
          description="无法加载仪表盘统计数据，请点击下方按钮重试"
          onRetry={loadStats}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 统计卡片行 */}
      <Row gutter={[16, 16]}>
        {/* 设备统计 - 所有用户可见 */}
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title={isAdmin ? '总设备数' : '我的设备'}
            value={stats?.totalDevices || 0}
            icon={<MobileOutlined />}
            color="#3f8600"
            loading={statsLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="在线设备"
            value={stats?.onlineDevices || 0}
            icon={<CloudServerOutlined />}
            color={token.colorPrimary}
            loading={statsLoading}
          />
        </Col>

        {/* 用户统计 - 仅管理员可见 */}
        <RoleGuard adminOnly>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="用户总数"
              value={stats?.totalUsers || 0}
              icon={<UserOutlined />}
              loading={statsLoading}
            />
          </Col>
        </RoleGuard>

        {/* 应用统计 - 仅管理员可见 */}
        <RoleGuard adminOnly>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="应用总数"
              value={stats?.totalApps || 0}
              icon={<AppstoreOutlined />}
              loading={statsLoading}
            />
          </Col>
        </RoleGuard>

        {/* 收入统计 - 仅管理员可见 */}
        <RoleGuard adminOnly>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="今日收入"
              value={stats?.todayRevenue || 0}
              prefix="¥"
              precision={2}
              color="#cf1322"
              loading={statsLoading}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="本月收入"
              value={stats?.monthRevenue || 0}
              prefix="¥"
              precision={2}
              color="#cf1322"
              loading={statsLoading}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="今日订单"
              value={stats?.todayOrders || 0}
              icon={<ShoppingOutlined />}
              color="#faad14"
              loading={statsLoading}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <StatCard
              title="本月订单"
              value={stats?.monthOrders || 0}
              icon={<ShoppingOutlined />}
              color="#faad14"
              loading={statsLoading}
            />
          </Col>
        </RoleGuard>
      </Row>

      {/* 图表数据错误提示 */}
      {hasChartsError && (
        <DataErrorAlert
          title="加载图表数据失败"
          description="无法加载图表数据，请点击下方按钮重试"
          onRetry={loadChartData}
          style={{ marginTop: 24, marginBottom: 16 }}
        />
      )}

      {/* 图表行 1: 收入趋势 + 设备状态 */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <RoleGuard adminOnly>
          <Col xs={24} lg={16}>
            <Card title="近7天收入趋势">
              <RevenueChartLazy data={revenueData} loading={chartsLoading} />
            </Card>
          </Col>
        </RoleGuard>

        <Col xs={24} lg={isAdmin ? 8 : 24}>
          <Card title="设备状态分布">
            <DeviceStatusChartLazy data={deviceStatusData} loading={chartsLoading} />
          </Card>
        </Col>
      </Row>

      {/* 图表行 2: 用户增长 + 套餐分布 - 仅管理员可见 */}
      <RoleGuard adminOnly>
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} lg={16}>
            <Card title="近30天用户增长">
              <UserGrowthChartLazy data={userGrowthData} loading={chartsLoading} />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="套餐用户分布">
              <PlanDistributionChartLazy data={planDistributionData} loading={chartsLoading} />
            </Card>
          </Col>
        </Row>
      </RoleGuard>
    </div>
  );
};

export default Dashboard;
