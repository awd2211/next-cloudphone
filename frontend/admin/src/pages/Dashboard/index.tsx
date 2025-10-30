import { useState, useEffect } from 'react';
import { Row, Col, Card, Statistic, Alert, Tag } from 'antd';
import { MobileOutlined, UserOutlined, AppstoreOutlined, CloudServerOutlined, DollarOutlined, ShoppingOutlined } from '@ant-design/icons';
import { getDashboardStats, getUserGrowthStats, getPlanDistributionStats } from '@/services/stats';
import { getRevenueStats } from '@/services/billing';
import { getDeviceStats } from '@/services/device';
import type { DashboardStats } from '@/types';
import {
  RevenueChartLazy,
  DeviceStatusChartLazy,
  UserGrowthChartLazy,
  PlanDistributionChartLazy
} from '@/components/LazyComponents';
import { useAsyncOperation } from '@/hooks/useAsyncOperation';
import { useRole } from '@/hooks/useRole';
import { RoleGuard } from '@/hooks/useRole';
import dayjs from 'dayjs';

const Dashboard = () => {
  const { isAdmin, roleDisplayName, roleColor } = useRole();
  const [stats, setStats] = useState<DashboardStats>();
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [deviceStatusData, setDeviceStatusData] = useState<any[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<any[]>([]);
  const [planDistributionData, setPlanDistributionData] = useState<any[]>([]);
  const [hasStatsError, setHasStatsError] = useState(false);
  const [hasChartsError, setHasChartsError] = useState(false);

  const { execute: executeStatsLoad, loading: statsLoading } = useAsyncOperation();
  const { execute: executeChartsLoad, loading: chartsLoading } = useAsyncOperation();

  const loadStats = async () => {
    const result = await executeStatsLoad(
      async () => {
        const response: any = await getDashboardStats();
        return response?.data || response;
      },
      {
        errorContext: '加载仪表盘统计数据',
        showSuccessMessage: false,
        onSuccess: (data) => {
          setStats(data);
          setHasStatsError(false);
        },
        onError: () => {
          setHasStatsError(true);
        },
      }
    );
  };

  const loadChartData = async () => {
    const result = await executeChartsLoad(
      async () => {
        // 加载近7天收入数据
        const endDate = dayjs().format('YYYY-MM-DD');
        const startDate = dayjs().subtract(6, 'day').format('YYYY-MM-DD');
        const revenueRes: any = await getRevenueStats(startDate, endDate);
        const revenueDataResult = revenueRes?.data?.dailyStats || revenueRes?.dailyStats || [];

        // 加载设备状态数据
        const deviceRes: any = await getDeviceStats();
        const deviceData = deviceRes?.data || deviceRes;
        const statusData = [
          { status: 'idle', count: deviceData.idle || 0 },
          { status: 'running', count: deviceData.running || 0 },
          { status: 'stopped', count: deviceData.stopped || 0 },
        ].filter(item => item.count > 0);

        // 加载用户增长数据（近30天）
        const userGrowthRes: any = await getUserGrowthStats(30);
        const userGrowthResult = userGrowthRes?.data || userGrowthRes || [];

        // 加载套餐分布数据
        const planDistRes: any = await getPlanDistributionStats();
        const planDistResult = planDistRes?.data || planDistRes || [];

        return {
          revenueData: revenueDataResult,
          deviceStatusData: statusData,
          userGrowthData: userGrowthResult,
          planDistributionData: planDistResult,
        };
      },
      {
        errorContext: '加载图表数据',
        showSuccessMessage: false,
        onSuccess: (data) => {
          setRevenueData(data.revenueData);
          setDeviceStatusData(data.deviceStatusData);
          setUserGrowthData(data.userGrowthData);
          setPlanDistributionData(data.planDistributionData);
          setHasChartsError(false);
        },
        onError: () => {
          setHasChartsError(true);
        },
      }
    );
  };

  useEffect(() => {
    loadStats();
    loadChartData();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ marginBottom: 0 }}>仪表盘</h2>
        <Tag color={roleColor}>{roleDisplayName}</Tag>
      </div>

      {/* 错误提示 */}
      {hasStatsError && (
        <Alert
          message="加载统计数据失败"
          description="无法加载仪表盘统计数据，请点击下方按钮重试"
          type="error"
          showIcon
          closable
          action={
            <a onClick={loadStats} style={{ textDecoration: 'underline' }}>
              重试
            </a>
          }
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]}>
        {/* 设备统计 - 所有用户可见 */}
        <Col xs={24} sm={12} lg={6}>
          <Card loading={statsLoading}>
            <Statistic
              title={isAdmin ? "总设备数" : "我的设备"}
              value={stats?.totalDevices || 0}
              prefix={<MobileOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={statsLoading}>
            <Statistic
              title="在线设备"
              value={stats?.onlineDevices || 0}
              prefix={<CloudServerOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>

        {/* 用户统计 - 仅管理员可见 */}
        <RoleGuard adminOnly>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={statsLoading}>
              <Statistic title="用户总数" value={stats?.totalUsers || 0} prefix={<UserOutlined />} />
            </Card>
          </Col>
        </RoleGuard>

        {/* 应用统计 - 仅管理员可见 */}
        <RoleGuard adminOnly>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={statsLoading}>
              <Statistic title="应用总数" value={stats?.totalApps || 0} prefix={<AppstoreOutlined />} />
            </Card>
          </Col>
        </RoleGuard>

        {/* 收入统计 - 仅管理员可见 */}
        <RoleGuard adminOnly>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={statsLoading}>
              <Statistic title="今日收入" value={stats?.todayRevenue || 0} prefix="¥" precision={2} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={statsLoading}>
              <Statistic title="本月收入" value={stats?.monthRevenue || 0} prefix="¥" precision={2} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={statsLoading}>
              <Statistic title="今日订单" value={stats?.todayOrders || 0} prefix={<ShoppingOutlined />} valueStyle={{ color: '#faad14' }} />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card loading={statsLoading}>
              <Statistic title="本月订单" value={stats?.monthOrders || 0} prefix={<ShoppingOutlined />} valueStyle={{ color: '#faad14' }} />
            </Card>
          </Col>
        </RoleGuard>
      </Row>

      {/* 图表错误提示 */}
      {hasChartsError && (
        <Alert
          message="加载图表数据失败"
          description="无法加载图表数据，请点击下方按钮重试"
          type="warning"
          showIcon
          closable
          action={
            <a onClick={loadChartData} style={{ textDecoration: 'underline' }}>
              重试
            </a>
          }
          style={{ marginTop: 24, marginBottom: 16 }}
        />
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {/* 收入趋势 - 仅管理员可见 */}
        <RoleGuard adminOnly>
          <Col xs={24} lg={16}>
            <Card title="近7天收入趋势">
              <RevenueChartLazy data={revenueData} loading={chartsLoading} />
            </Card>
          </Col>
        </RoleGuard>

        {/* 设备状态分布 - 所有用户可见 */}
        <Col xs={24} lg={isAdmin ? 8 : 24}>
          <Card title="设备状态分布">
            <DeviceStatusChartLazy data={deviceStatusData} loading={chartsLoading} />
          </Card>
        </Col>
      </Row>

      {/* 用户增长和套餐分布 - 仅管理员可见 */}
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
