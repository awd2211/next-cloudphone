import React, { useMemo, useCallback, memo } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Progress,
  Button,
  Space,
  Badge,
  theme,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useSMSProviderComparison as useProviderComparison } from '@/hooks/queries/useSMS';
import { SEMANTIC, NEUTRAL_LIGHT } from '@/theme';
import type { ColumnsType } from 'antd/es/table';

// 本地类型定义（组件期望的数据结构）
interface ProviderStat {
  provider: string;
  enabled: boolean;
  priority: number;
  totalRequests: number;
  successCount: number;
  failureCount: number;
  successRate: number;
  averageResponseTime: number; // seconds
  averageCost: number;
  isHealthy: boolean;
  consecutiveFailures: number;
  lastFailure?: string;
  configuredWeights: {
    cost: number | string;
    speed: number | string;
    successRate: number | string;
  };
}

// API 返回的数据结构
interface ProviderComparisonResponse {
  timestamp: string;
  providers: ProviderStat[];
  recommendation: string;
}

/**
 * 平台监控与对比标签页
 *
 * 功能：
 * - 各SMS平台健康状态监控
 * - 性能对比（成功率、响应时间、成本）
 * - 平台推荐
 */
// ✅ 使用 memo 包装组件，避免不必要的重渲染
const ProviderMonitorTab: React.FC = memo(() => {
  const { token } = theme.useToken();

  // 使用新的 React Query Hook
  const { data, isLoading, refetch } = useProviderComparison();

  // 正确解析 API 返回的数据结构
  // API 返回 { timestamp, providers: [...], recommendation } 格式
  const response = data as unknown as ProviderComparisonResponse | undefined;
  const providers = response?.providers;
  const apiRecommendation = response?.recommendation;

  // ✅ 使用 useCallback 缓存辅助函数
  const getHealthBadge = useCallback((isHealthy: boolean, consecutiveFailures: number) => {
    if (consecutiveFailures >= 3) {
      return <Badge status="error" text="异常" />;
    }
    if (!isHealthy) {
      return <Badge status="warning" text="不稳定" />;
    }
    return <Badge status="success" text="健康" />;
  }, []);

  // ✅ 使用 useMemo 缓存列定义
  const columns: ColumnsType<ProviderStat> = useMemo(() => [
    {
      title: '平台',
      dataIndex: 'provider',
      key: 'provider',
      width: 150,
      render: (provider, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{provider}</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            优先级: {record.priority}
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          {getHealthBadge(record.isHealthy, record.consecutiveFailures)}
          <Tag color={record.enabled ? 'success' : 'default'}>
            {record.enabled ? '启用' : '禁用'}
          </Tag>
        </Space>
      ),
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      width: 150,
      sorter: (a, b) => a.successRate - b.successRate,
      render: (rate) => (
        <Progress
          percent={rate}
          size="small"
          status={rate >= 90 ? 'success' : rate >= 70 ? 'normal' : 'exception'}
        />
      ),
    },
    {
      title: '平均响应',
      dataIndex: 'averageResponseTime',
      key: 'averageResponseTime',
      width: 120,
      sorter: (a, b) => a.averageResponseTime - b.averageResponseTime,
      render: (time) => (
        <span style={{ color: time > 60 ? SEMANTIC.error.main : SEMANTIC.success.main }}>
          {time.toFixed(1)}s
        </span>
      ),
    },
    {
      title: '平均成本',
      dataIndex: 'averageCost',
      key: 'averageCost',
      width: 120,
      sorter: (a, b) => a.averageCost - b.averageCost,
      render: (cost) => `$${cost.toFixed(4)}`,
    },
    {
      title: '请求统计',
      key: 'requests',
      width: 150,
      render: (_, record) => (
        <div>
          <div>总数: {record.totalRequests}</div>
          <div style={{ fontSize: 12, color: SEMANTIC.success.main }}>
            成功: {record.successCount}
          </div>
          <div style={{ fontSize: 12, color: SEMANTIC.error.main }}>
            失败: {record.failureCount}
          </div>
        </div>
      ),
    },
    {
      title: '连续失败',
      dataIndex: 'consecutiveFailures',
      key: 'consecutiveFailures',
      width: 100,
      render: (failures) => (
        <Tag color={failures >= 3 ? 'error' : failures > 0 ? 'warning' : 'success'}>
          {failures}
        </Tag>
      ),
    },
    {
      title: '权重配置',
      key: 'weights',
      width: 150,
      render: (_, record) => (
        <div style={{ fontSize: 12 }}>
          <div>成本: {record.configuredWeights.cost}</div>
          <div>速度: {record.configuredWeights.speed}</div>
          <div>成功率: {record.configuredWeights.successRate}</div>
        </div>
      ),
    },
  ], [getHealthBadge]);

  // ✅ 使用 useMemo 缓存总览统计计算
  const totalStats = useMemo(() => providers?.reduce(
    (acc: any, p: any) => ({
      totalRequests: acc.totalRequests + p.totalRequests,
      successCount: acc.successCount + p.successCount,
      failureCount: acc.failureCount + p.failureCount,
      totalCost: acc.totalCost + p.averageCost * p.totalRequests,
    }),
    { totalRequests: 0, successCount: 0, failureCount: 0, totalCost: 0 }
  ) || { totalRequests: 0, successCount: 0, failureCount: 0, totalCost: 0 }, [providers]);

  const avgSuccessRate = useMemo(() =>
    totalStats.totalRequests > 0
      ? (totalStats.successCount / totalStats.totalRequests) * 100
      : 0, [totalStats]);

  // 使用 API 返回的推荐信息
  const recommendation = apiRecommendation;

  return (
    <div>
      {/* 总览统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃平台数"
              value={providers?.filter((p: any) => p.enabled).length || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: SEMANTIC.success.main }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总请求数"
              value={totalStats.totalRequests}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均成功率"
              value={avgSuccessRate.toFixed(1)}
              suffix="%"
              prefix={<CheckCircleOutlined />}
              valueStyle={{
                color: avgSuccessRate >= 90 ? SEMANTIC.success.main : avgSuccessRate >= 70 ? SEMANTIC.warning.main : SEMANTIC.error.main,
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总成本"
              value={totalStats.totalCost.toFixed(4)}
              prefix={<DollarOutlined />}
              valueStyle={{ color: token.colorPrimary }}
            />
          </Card>
        </Col>
      </Row>

      {/* 推荐信息 */}
      {recommendation && (
        <Card
          size="small"
          style={{ marginBottom: 16, backgroundColor: '#e6f7ff' }}
        >
          <div style={{ whiteSpace: 'pre-line' }}>
            <strong>智能推荐：</strong>
            {recommendation}
          </div>
        </Card>
      )}

      {/* 操作按钮 */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
          >
            刷新数据
          </Button>
        </Space>
      </div>

      {/* 平台对比表格 */}
      <Table
        columns={columns}
        dataSource={providers || []}
        rowKey="provider"
        loading={isLoading}
        pagination={false}
        scroll={{ x: 1200 }}
      />
    </div>
  );
});

ProviderMonitorTab.displayName = 'SMS.ProviderMonitorTab';

export default ProviderMonitorTab;
