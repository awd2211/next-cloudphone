import { useMemo, memo } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Progress,
  Button,
  Spin,
} from 'antd';
import { SEMANTIC, PRIMARY, NEUTRAL_LIGHT } from '@/theme';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  CloudOutlined,
  ApiOutlined,
  DashboardOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  useProxyProviderRanking,
  useProxyProviders,
  useProxyStats,
  type ProxyProviderRanking,
} from '@/hooks/queries/useProxy';
import type { ColumnsType } from 'antd/es/table';

/**
 * 供应商监控与排名标签页
 *
 * 功能：
 * - 供应商性能排名
 * - 各项指标对比
 * - 健康状态监控
 */
// ✅ 使用 memo 包装组件，避免不必要的重渲染
const ProviderMonitorTab: React.FC = memo(() => {
  // 使用 React Query Hooks
  // 1. 获取已配置的供应商列表（用于 "活跃供应商" 统计）
  const { data: configuredProviders = [] } = useProxyProviders();
  // 2. 获取供应商排名数据（用于排名表格）
  const { data: rankingData = [], isLoading: isRankingLoading, refetch } = useProxyProviderRanking();
  // 3. 获取代理池实际统计数据（用于总览统计卡片）
  const { data: poolStats, isLoading: isStatsLoading } = useProxyStats();

  // 计算活跃供应商数量（已启用且有配置）
  const activeProviderCount = useMemo(() => {
    return configuredProviders.filter(p => p.enabled && p.hasConfig).length;
  }, [configuredProviders]);

  // 组合加载状态
  const isLoading = isRankingLoading || isStatsLoading;

  // ✅ 使用 useMemo 缓存列定义
  const columns: ColumnsType<ProxyProviderRanking> = useMemo(() => [
    {
      title: '排名',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank: number) => (
        <Tag color={rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? '#cd7f32' : 'default'}>
          #{rank}
        </Tag>
      ),
    },
    {
      title: '供应商',
      dataIndex: 'provider',
      key: 'provider',
      width: 150,
      render: (provider: string, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{provider}</div>
          <div style={{ fontSize: 12, color: NEUTRAL_LIGHT.text.tertiary }}>
            综合评分: {record.score.toFixed(1)}
          </div>
        </div>
      ),
    },
    {
      title: '代理统计',
      key: 'proxies',
      width: 150,
      render: (_, record) => (
        <div>
          <div>总数: {record.totalProxies}</div>
          <div style={{ fontSize: 12, color: SEMANTIC.success.main }}>
            可用: {record.availableProxies}
          </div>
        </div>
      ),
    },
    {
      title: '质量评分',
      dataIndex: 'qualityScore',
      key: 'qualityScore',
      width: 150,
      sorter: (a, b) => a.qualityScore - b.qualityScore,
      render: (score: number, record) => (
        <div>
          <Progress percent={score} size="small" status="normal" />
          <div style={{ fontSize: 12, marginTop: 4 }}>
            平均质量: {record.avgQuality.toFixed(1)}
          </div>
        </div>
      ),
    },
    {
      title: '延迟评分',
      dataIndex: 'latencyScore',
      key: 'latencyScore',
      width: 150,
      sorter: (a, b) => a.latencyScore - b.latencyScore,
      render: (score: number, record) => (
        <div>
          <Progress percent={score} size="small" status="normal" />
          <div style={{ fontSize: 12, marginTop: 4 }}>
            平均延迟: {record.avgLatency.toFixed(0)}ms
          </div>
        </div>
      ),
    },
    {
      title: '成本评分',
      dataIndex: 'costScore',
      key: 'costScore',
      width: 150,
      sorter: (a, b) => a.costScore - b.costScore,
      render: (score: number, record) => (
        <div>
          <Progress percent={score} size="small" status="normal" />
          <div style={{ fontSize: 12, marginTop: 4 }}>
            ${record.avgCostPerGB.toFixed(2)}/GB
          </div>
        </div>
      ),
    },
    {
      title: '可用性评分',
      dataIndex: 'availabilityScore',
      key: 'availabilityScore',
      width: 150,
      sorter: (a, b) => a.availabilityScore - b.availabilityScore,
      render: (score: number, record) => (
        <div>
          <Progress percent={score} size="small" status="normal" />
          <div style={{ fontSize: 12, marginTop: 4 }}>
            成功率: {record.successRate.toFixed(1)}%
          </div>
        </div>
      ),
    },
  ], []);

  // ✅ 使用 useMemo 缓存总览统计计算 - 优先使用 poolStats 的真实数据
  const { totalProxies, totalAvailable, inUse, unhealthy, avgQuality, avgLatency, bestProvider } = useMemo(() => {
    // 从池统计 API 获取真实数据
    // 后端字段名: averageQuality, averageLatency (驼峰命名)
    const total = poolStats?.total ?? 0;
    const available = poolStats?.available ?? 0;
    const used = poolStats?.inUse ?? 0;
    const bad = poolStats?.unhealthy ?? poolStats?.unavailable ?? 0;
    // 兼容两种字段名
    const quality = poolStats?.averageQuality ?? poolStats?.avgQuality ?? 0;
    const latency = poolStats?.averageLatency ?? poolStats?.avgLatency ?? 0;

    // 排名数据用于显示最佳供应商
    const best = rankingData.length > 0 ? rankingData[0] : null;

    return {
      totalProxies: total,
      totalAvailable: available,
      inUse: used,
      unhealthy: bad,
      avgQuality: quality,
      avgLatency: latency,
      bestProvider: best
    };
  }, [poolStats, rankingData]);

  return (
    <Spin spinning={isLoading}>
    <div>
      {/* 总览统计 - 第一行 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃供应商"
              value={activeProviderCount}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: SEMANTIC.success.main }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总代理数"
              value={totalProxies.toLocaleString()}
              prefix={<CloudOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="可用代理"
              value={totalAvailable.toLocaleString()}
              prefix={<ApiOutlined />}
              valueStyle={{ color: SEMANTIC.success.main }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="使用中"
              value={inUse.toLocaleString()}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: PRIMARY.main }}
            />
          </Card>
        </Col>
      </Row>

      {/* 总览统计 - 第二行 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="不可用"
              value={unhealthy}
              valueStyle={{ color: unhealthy > 0 ? SEMANTIC.error.main : SEMANTIC.success.main }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均质量"
              value={avgQuality}
              suffix="/100"
              prefix={<DashboardOutlined />}
              valueStyle={{
                color: avgQuality >= 80 ? SEMANTIC.success.main : avgQuality >= 60 ? SEMANTIC.warning.main : SEMANTIC.error.main,
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均延迟"
              value={avgLatency}
              suffix="ms"
              prefix={<ClockCircleOutlined />}
              valueStyle={{
                color: avgLatency <= 100 ? SEMANTIC.success.main : avgLatency <= 200 ? SEMANTIC.warning.main : SEMANTIC.error.main,
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="可用率"
              value={totalProxies > 0 ? ((totalAvailable / totalProxies) * 100).toFixed(1) : 0}
              suffix="%"
              valueStyle={{ color: SEMANTIC.success.main }}
            />
          </Card>
        </Col>
      </Row>

      {/* 最佳供应商推荐 */}
      {bestProvider && (
        <Card
          size="small"
          style={{ marginBottom: 16, backgroundColor: '#e6f7ff' }}
        >
          <div>
            <strong>🏆 推荐供应商：</strong>
            <Tag color="gold" style={{ marginLeft: 8 }}>
              {bestProvider.provider}
            </Tag>
            <span style={{ marginLeft: 8 }}>
              综合评分 {bestProvider.score.toFixed(1)}，质量 {bestProvider.avgQuality.toFixed(1)}，
              延迟 {bestProvider.avgLatency.toFixed(0)}ms，
              成本 ${bestProvider.avgCostPerGB.toFixed(2)}/GB
            </span>
          </div>
        </Card>
      )}

      {/* 操作按钮 */}
      <div style={{ marginBottom: 16 }}>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
        >
          刷新数据
        </Button>
      </div>

      {/* 供应商排名表格 */}
      <Table
        columns={columns}
        dataSource={rankingData}
        rowKey="provider"
        loading={isRankingLoading}
        pagination={false}
        scroll={{ x: 1200 }}
        locale={{
          emptyText: activeProviderCount > 0
            ? '暂无排名数据，请先刷新代理池以生成评分'
            : '暂无供应商配置，请先添加供应商',
        }}
      />
    </div>
    </Spin>
  );
});

ProviderMonitorTab.displayName = 'Proxy.ProviderMonitorTab';

export default ProviderMonitorTab;
