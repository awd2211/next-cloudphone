import { Card, Row, Col, Statistic, Tag, Progress, theme } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import {
  PhoneOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import request from '@/utils/request';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

interface RealtimeData {
  timestamp: string;
  activeNumbers: {
    total: number;
    byProvider: Record<string, number>;
    byStatus: Record<string, number>;
  };
  recentActivity: {
    last5Minutes: {
      requests: number;
      successes: number;
      failures: number;
    };
    last15Minutes: {
      requests: number;
      successes: number;
      failures: number;
    };
    lastHour: {
      requests: number;
      successes: number;
      failures: number;
    };
  };
  providerHealth: Record<
    string,
    {
      status: string;
      successRate: number;
      avgResponseTime: number;
      consecutiveFailures: number;
    }
  >;
}

interface ProviderHealthRow {
  provider: string;
  status: string;
  successRate: number;
  avgResponseTime: number;
  consecutiveFailures: number;
}

/**
 * 实时监控标签页
 *
 * 功能：
 * - 当前活跃号码监控
 * - 最近活动统计（5分钟/15分钟/1小时）
 * - 平台健康状态实时监控
 */
const RealtimeMonitorTab: React.FC = () => {
  const { token } = theme.useToken();
  // 查询实时监控数据，每10秒自动刷新
  const { data, isLoading } = useQuery<RealtimeData>({
    queryKey: ['sms-realtime'],
    queryFn: async () => {
      const response = await request.get('/sms/statistics/realtime');
      return response;
    },
    refetchInterval: 10000, // 每10秒刷新
  });

  // 转换平台健康数据为表格格式
  const providerHealthData: ProviderHealthRow[] = Object.entries(data?.providerHealth || {}).map(
    ([provider, health]) => ({
      provider,
      ...health,
    })
  );

  const healthColumns: ColumnsType<ProviderHealthRow> = [
    {
      title: '平台',
      dataIndex: 'provider',
      key: 'provider',
      width: 150,
    },
    {
      title: '健康状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={status === 'healthy' ? 'success' : 'error'}>
          {status === 'healthy' ? '健康' : '不健康'}
        </Tag>
      ),
    },
    {
      title: '成功率',
      dataIndex: 'successRate',
      key: 'successRate',
      width: 150,
      render: (rate) => (
        <Progress
          percent={rate}
          size="small"
          status={rate >= 90 ? 'success' : rate >= 70 ? 'normal' : 'exception'}
        />
      ),
    },
    {
      title: '平均响应时间',
      dataIndex: 'avgResponseTime',
      key: 'avgResponseTime',
      width: 150,
      render: (time) => (
        <span style={{ color: time > 60 ? '#ff4d4f' : '#52c41a' }}>
          {time.toFixed(1)}s
        </span>
      ),
    },
    {
      title: '连续失败次数',
      dataIndex: 'consecutiveFailures',
      key: 'consecutiveFailures',
      width: 120,
      render: (failures) => (
        <Tag color={failures >= 3 ? 'error' : failures > 0 ? 'warning' : 'success'}>
          {failures}
        </Tag>
      ),
    },
  ];

  // 计算活动统计的成功率
  const calculateSuccessRate = (activity: { requests: number; successes: number }) => {
    if (activity.requests === 0) return 0;
    return ((activity.successes / activity.requests) * 100).toFixed(1);
  };

  return (
    <div>
      {/* 更新时间 */}
      <div style={{ marginBottom: 16, textAlign: 'right', color: '#999' }}>
        最后更新: {data ? dayjs(data.timestamp).format('YYYY-MM-DD HH:mm:ss') : '-'}
      </div>

      {/* 活跃号码总览 */}
      <Card title="活跃号码总览" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title="总活跃号码"
                value={data?.activeNumbers.total || 0}
                prefix={<PhoneOutlined />}
                valueStyle={{ color: token.colorPrimary }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title="按平台分布"
                value={Object.keys(data?.activeNumbers.byProvider || {}).length}
                suffix="个平台"
              />
              <div style={{ marginTop: 8, fontSize: 12 }}>
                {Object.entries(data?.activeNumbers.byProvider || {}).map(
                  ([provider, count]) => (
                    <div key={provider}>
                      {provider}: {count}
                    </div>
                  )
                )}
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Card>
              <Statistic
                title="按状态分布"
                value={Object.keys(data?.activeNumbers.byStatus || {}).length}
                suffix="种状态"
              />
              <div style={{ marginTop: 8, fontSize: 12 }}>
                {Object.entries(data?.activeNumbers.byStatus || {}).map(
                  ([status, count]) => (
                    <div key={status}>
                      {status}: {count}
                    </div>
                  )
                )}
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 最近活动统计 */}
      <Card title="最近活动统计" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card
              title={
                <>
                  <ClockCircleOutlined /> 最近 5 分钟
                </>
              }
              size="small"
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="请求"
                    value={data?.recentActivity.last5Minutes.requests || 0}
                    valueStyle={{ fontSize: 20 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="成功"
                    value={data?.recentActivity.last5Minutes.successes || 0}
                    valueStyle={{ color: '#3f8600', fontSize: 20 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="失败"
                    value={data?.recentActivity.last5Minutes.failures || 0}
                    valueStyle={{ color: '#cf1322', fontSize: 20 }}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 12 }}>
                <Tag color="blue">
                  成功率:{' '}
                  {data && calculateSuccessRate(data.recentActivity.last5Minutes)}%
                </Tag>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              title={
                <>
                  <ClockCircleOutlined /> 最近 15 分钟
                </>
              }
              size="small"
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="请求"
                    value={data?.recentActivity.last15Minutes.requests || 0}
                    valueStyle={{ fontSize: 20 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="成功"
                    value={data?.recentActivity.last15Minutes.successes || 0}
                    valueStyle={{ color: '#3f8600', fontSize: 20 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="失败"
                    value={data?.recentActivity.last15Minutes.failures || 0}
                    valueStyle={{ color: '#cf1322', fontSize: 20 }}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 12 }}>
                <Tag color="blue">
                  成功率:{' '}
                  {data && calculateSuccessRate(data.recentActivity.last15Minutes)}%
                </Tag>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card
              title={
                <>
                  <ClockCircleOutlined /> 最近 1 小时
                </>
              }
              size="small"
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="请求"
                    value={data?.recentActivity.lastHour.requests || 0}
                    valueStyle={{ fontSize: 20 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="成功"
                    value={data?.recentActivity.lastHour.successes || 0}
                    valueStyle={{ color: '#3f8600', fontSize: 20 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="失败"
                    value={data?.recentActivity.lastHour.failures || 0}
                    valueStyle={{ color: '#cf1322', fontSize: 20 }}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 12 }}>
                <Tag color="blue">
                  成功率:{' '}
                  {data && calculateSuccessRate(data.recentActivity.lastHour)}%
                </Tag>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 平台健康状态 */}
      <Card title="平台健康状态">
        <AccessibleTable<ProviderHealthRow>
          ariaLabel="平台健康状态列表"
          loadingText="正在加载平台健康状态"
          emptyText="暂无平台健康状态数据"
          columns={healthColumns}
          dataSource={providerHealthData}
          rowKey="provider"
          loading={isLoading}
          pagination={false}
          scroll={{ y: 300 }}
          virtual
        />
      </Card>
    </div>
  );
};

export default RealtimeMonitorTab;
