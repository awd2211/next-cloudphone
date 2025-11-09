import { useState } from 'react';
import {
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Progress,
  Button,
  message,
  Space,
  Badge,
  theme,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import request from '@/utils/request';
import type { ColumnsType } from 'antd/es/table';

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
    cost: number;
    speed: number;
    successRate: number;
  };
}

interface ComparisonData {
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
const ProviderMonitorTab: React.FC = () => {
  const { token } = theme.useToken();
  const queryClient = useQueryClient();

  // 查询平台对比数据
  const { data, isLoading } = useQuery<ComparisonData>({
    queryKey: ['sms-provider-comparison'],
    queryFn: async () => {
      const response = await request.get('/sms/statistics/providers/comparison');
      return response;
    },
    refetchInterval: 30000, // 每30秒刷新
  });

  const getHealthBadge = (isHealthy: boolean, consecutiveFailures: number) => {
    if (consecutiveFailures >= 3) {
      return <Badge status="error" text="异常" />;
    }
    if (!isHealthy) {
      return <Badge status="warning" text="不稳定" />;
    }
    return <Badge status="success" text="健康" />;
  };

  const columns: ColumnsType<ProviderStat> = [
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
        <span style={{ color: time > 60 ? '#ff4d4f' : '#52c41a' }}>
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
          <div style={{ fontSize: 12, color: '#52c41a' }}>
            成功: {record.successCount}
          </div>
          <div style={{ fontSize: 12, color: '#ff4d4f' }}>
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
  ];

  // 计算总览统计
  const totalStats = data?.providers.reduce(
    (acc, p) => ({
      totalRequests: acc.totalRequests + p.totalRequests,
      successCount: acc.successCount + p.successCount,
      failureCount: acc.failureCount + p.failureCount,
      totalCost: acc.totalCost + p.averageCost * p.totalRequests,
    }),
    { totalRequests: 0, successCount: 0, failureCount: 0, totalCost: 0 }
  ) || { totalRequests: 0, successCount: 0, failureCount: 0, totalCost: 0 };

  const avgSuccessRate =
    totalStats.totalRequests > 0
      ? (totalStats.successCount / totalStats.totalRequests) * 100
      : 0;

  return (
    <div>
      {/* 总览统计卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃平台数"
              value={data?.providers.filter((p) => p.enabled).length || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
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
                color: avgSuccessRate >= 90 ? '#3f8600' : avgSuccessRate >= 70 ? '#faad14' : '#cf1322',
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
      {data?.recommendation && (
        <Card
          size="small"
          style={{ marginBottom: 16, backgroundColor: '#e6f7ff' }}
        >
          <div style={{ whiteSpace: 'pre-line' }}>
            <strong>智能推荐：</strong>
            {data.recommendation}
          </div>
        </Card>
      )}

      {/* 操作按钮 */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ['sms-provider-comparison'],
              })
            }
          >
            刷新数据
          </Button>
        </Space>
      </div>

      {/* 平台对比表格 */}
      <Table
        columns={columns}
        dataSource={data?.providers || []}
        rowKey="provider"
        loading={isLoading}
        pagination={false}
        scroll={{ x: 1200 }}
      />
    </div>
  );
};

export default ProviderMonitorTab;
