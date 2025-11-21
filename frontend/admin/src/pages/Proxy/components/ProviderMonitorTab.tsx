import {
  Table,
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Progress,
  Button,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useProxyProviderRanking, type ProxyProviderRanking } from '@/hooks/queries/useProxy';
import type { ColumnsType } from 'antd/es/table';

/**
 * 供应商监控与排名标签页
 *
 * 功能：
 * - 供应商性能排名
 * - 各项指标对比
 * - 健康状态监控
 */
const ProviderMonitorTab: React.FC = () => {
  // 使用新的 React Query Hook
  const { data: providers = [], isLoading, refetch } = useProxyProviderRanking();

  const columns: ColumnsType<ProxyProviderRanking> = [
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
          <div style={{ fontSize: 12, color: '#999' }}>
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
          <div style={{ fontSize: 12, color: '#52c41a' }}>
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
  ];

  // 计算总览统计
  const totalProxies = providers.reduce((sum: number, p: any) => sum + p.totalProxies, 0);
  const totalAvailable = providers.reduce((sum: number, p: any) => sum + p.availableProxies, 0);
  const avgScore = providers.length > 0
    ? providers.reduce((sum: number, p: any) => sum + p.score, 0) / providers.length
    : 0;
  const bestProvider = providers.length > 0 ? providers[0] : null;

  return (
    <div>
      {/* 总览统计 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="活跃供应商"
              value={providers.length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="总代理数"
              value={totalProxies}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="可用代理"
              value={totalAvailable}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均评分"
              value={avgScore.toFixed(1)}
              suffix="/100"
              valueStyle={{
                color: avgScore >= 80 ? '#3f8600' : avgScore >= 60 ? '#faad14' : '#cf1322',
              }}
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
        dataSource={providers}
        rowKey="provider"
        loading={isLoading}
        pagination={false}
        scroll={{ x: 1200 }}
      />
    </div>
  );
};

export default ProviderMonitorTab;
