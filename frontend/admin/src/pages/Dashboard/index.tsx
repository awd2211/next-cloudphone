import { useEffect, useCallback, useMemo } from 'react';
import { Row, Col, Card, Tag, theme, message } from 'antd';
import {
  MobileOutlined,
  UserOutlined,
  AppstoreOutlined,
  CloudServerOutlined,
  ShoppingOutlined,
  ReloadOutlined,
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
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';

/**
 * 仪表盘页面 (优化版 v2)
 *
 * 优化策略:
 * 1. ✅ ErrorBoundary - 包裹整个页面，防止图表错误导致页面崩溃
 * 2. ✅ useDashboard Hook - 数据逻辑已提取
 * 3. ✅ useMemo - 缓存统计卡片配置和图表配置
 * 4. ✅ useCallback - 缓存刷新回调
 * 5. ✅ 快捷键支持 - Ctrl+R 刷新数据
 * 6. ✅ 分阶段加载 - 统计数据优先，图表延迟加载
 * 7. ✅ 错误边界分离 - 每个图表独立 ErrorBoundary
 */
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

  // ===== 刷新回调 =====
  const handleRefresh = useCallback(async () => {
    message.loading({ content: '正在刷新...', key: 'refresh' });
    try {
      await Promise.all([loadStats(), loadChartData()]);
      message.success({ content: '刷新成功', key: 'refresh' });
    } catch {
      message.error({ content: '刷新失败', key: 'refresh' });
    }
  }, [loadStats, loadChartData]);

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

  // ===== 统计卡片配置 =====
  const statsCardsConfig = useMemo(() => [
    // 所有用户可见
    {
      title: isAdmin ? '总设备数' : '我的设备',
      value: stats?.totalDevices || 0,
      icon: <MobileOutlined />,
      color: '#3f8600',
      visible: true,
    },
    {
      title: '在线设备',
      value: stats?.onlineDevices || 0,
      icon: <CloudServerOutlined />,
      color: token.colorPrimary,
      visible: true,
    },
    // 仅管理员可见
    {
      title: '用户总数',
      value: stats?.totalUsers || 0,
      icon: <UserOutlined />,
      visible: isAdmin,
    },
    {
      title: '应用总数',
      value: stats?.totalApps || 0,
      icon: <AppstoreOutlined />,
      visible: isAdmin,
    },
    {
      title: '今日收入',
      value: stats?.todayRevenue || 0,
      prefix: '¥',
      precision: 2,
      color: '#cf1322',
      visible: isAdmin,
    },
    {
      title: '本月收入',
      value: stats?.monthRevenue || 0,
      prefix: '¥',
      precision: 2,
      color: '#cf1322',
      visible: isAdmin,
    },
    {
      title: '今日订单',
      value: stats?.todayOrders || 0,
      icon: <ShoppingOutlined />,
      color: '#faad14',
      visible: isAdmin,
    },
    {
      title: '本月订单',
      value: stats?.monthOrders || 0,
      icon: <ShoppingOutlined />,
      color: '#faad14',
      visible: isAdmin,
    },
  ], [stats, isAdmin, token.colorPrimary]);

  // ===== 可见的统计卡片 =====
  const visibleStatsCards = useMemo(
    () => statsCardsConfig.filter(card => card.visible),
    [statsCardsConfig]
  );

  return (
    <ErrorBoundary boundaryName="Dashboard">
      <div>
        {/* 页面标题和角色标签 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ marginBottom: 0 }}>
            仪表盘
            <Tag
              icon={<ReloadOutlined spin={statsLoading || chartsLoading} />}
              color="processing"
              style={{ marginLeft: 12, cursor: 'pointer' }}
              onClick={handleRefresh}
            >
              Ctrl+R 刷新
            </Tag>
          </h2>
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
          {visibleStatsCards.map((card, index) => (
            <Col xs={24} sm={12} lg={6} key={card.title || index}>
              <StatCard
                title={card.title}
                value={card.value}
                icon={card.icon}
                color={card.color}
                prefix={card.prefix}
                precision={card.precision}
                loading={statsLoading}
              />
            </Col>
          ))}
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
                <ErrorBoundary boundaryName="RevenueChart">
                  <RevenueChartLazy data={revenueData} loading={chartsLoading} />
                </ErrorBoundary>
              </Card>
            </Col>
          </RoleGuard>

          <Col xs={24} lg={isAdmin ? 8 : 24}>
            <Card title="设备状态分布">
              <ErrorBoundary boundaryName="DeviceStatusChart">
                <DeviceStatusChartLazy data={deviceStatusData} loading={chartsLoading} />
              </ErrorBoundary>
            </Card>
          </Col>
        </Row>

        {/* 图表行 2: 用户增长 + 套餐分布 - 仅管理员可见 */}
        <RoleGuard adminOnly>
          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={24} lg={16}>
              <Card title="近30天用户增长">
                <ErrorBoundary boundaryName="UserGrowthChart">
                  <UserGrowthChartLazy data={userGrowthData} loading={chartsLoading} />
                </ErrorBoundary>
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="套餐用户分布">
                <ErrorBoundary boundaryName="PlanDistributionChart">
                  <PlanDistributionChartLazy data={planDistributionData} loading={chartsLoading} />
                </ErrorBoundary>
              </Card>
            </Col>
          </Row>
        </RoleGuard>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;
