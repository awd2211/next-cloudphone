/**
 * LiveChat 数据统计看板
 *
 * 功能:
 * - 概览统计 (会话总量、解决率、平均响应时间、平均评分)
 * - 会话趋势图
 * - 客服绩效排行
 * - 评分分布
 * - 高峰时段分析
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Select,
  DatePicker,
  Space,
  Progress,
  Tag,
  Tooltip,
  Empty,
  message,
} from 'antd';
import {
  MessageOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StarOutlined,
  RiseOutlined,
  FallOutlined,
  UserOutlined,
  BarChartOutlined,
  LineChartOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  getAnalyticsOverview,
  getConversationTrends,
  getAgentPerformance,
  getRatingDistribution,
  getPeakHours,
  type AnalyticsOverview,
  type AgentPerformance,
} from '@/services/livechat';

const { RangePicker } = DatePicker;
const { Option } = Select;

const AnalyticsDashboard: React.FC = () => {
  const queryClient = useQueryClient();

  // 状态管理
  const [days, setDays] = useState(7);
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  // 日期参数
  const dateParams = dateRange
    ? { startDate: dateRange[0], endDate: dateRange[1] }
    : undefined;

  // 刷新所有数据
  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ['livechat-analytics-overview'] });
    queryClient.invalidateQueries({ queryKey: ['livechat-conversation-trends'] });
    queryClient.invalidateQueries({ queryKey: ['livechat-agent-performance'] });
    queryClient.invalidateQueries({ queryKey: ['livechat-rating-distribution'] });
    queryClient.invalidateQueries({ queryKey: ['livechat-peak-hours'] });
  };

  // 快捷键支持 (数据统计页面只支持刷新)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refetchAll();
        message.info('正在刷新...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 获取概览统计
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery({
    queryKey: ['livechat-analytics-overview', dateParams],
    queryFn: () => getAnalyticsOverview(dateParams),
  });

  // 获取会话趋势
  const { data: trends = [], isLoading: trendsLoading } = useQuery({
    queryKey: ['livechat-conversation-trends', days],
    queryFn: () => getConversationTrends(days),
  });

  // 获取客服绩效
  const { data: agentPerformance = [], isLoading: performanceLoading, error: performanceError } = useQuery({
    queryKey: ['livechat-agent-performance', dateParams],
    queryFn: () => getAgentPerformance(dateParams),
  });

  // 获取评分分布
  const { data: ratingDistribution = [], isLoading: ratingLoading } = useQuery({
    queryKey: ['livechat-rating-distribution', dateParams],
    queryFn: () => getRatingDistribution(dateParams),
  });

  // 获取高峰时段
  const { data: peakHours = [], isLoading: peakLoading } = useQuery({
    queryKey: ['livechat-peak-hours', days],
    queryFn: () => getPeakHours(days),
  });

  // 找出最高峰时段
  const topPeakHour = peakHours.reduce(
    (max, curr) => (curr.count > max.count ? curr : max),
    { hour: 0, count: 0 }
  );

  // 客服绩效表格列
  const performanceColumns: ColumnsType<AgentPerformance> = [
    {
      title: '排名',
      key: 'rank',
      width: 60,
      render: (_, __, index) => {
        const colors = ['#ffd700', '#c0c0c0', '#cd7f32'];
        return index < 3 ? (
          <Tag color={colors[index]}>{index + 1}</Tag>
        ) : (
          <span>{index + 1}</span>
        );
      },
    },
    {
      title: '客服',
      dataIndex: 'agentName',
      key: 'agentName',
      render: (name: string) => (
        <Space>
          <UserOutlined />
          {name}
        </Space>
      ),
    },
    {
      title: '会话数',
      dataIndex: 'totalConversations',
      key: 'totalConversations',
      sorter: (a, b) => a.totalConversations - b.totalConversations,
    },
    {
      title: '解决率',
      key: 'resolutionRate',
      render: (_, record) => {
        const rate =
          record.totalConversations > 0
            ? (record.resolvedConversations / record.totalConversations) * 100
            : 0;
        return (
          <Progress
            percent={Math.round(rate)}
            size="small"
            status={rate >= 80 ? 'success' : rate >= 60 ? 'normal' : 'exception'}
          />
        );
      },
    },
    {
      title: '平均响应',
      dataIndex: 'avgResponseTime',
      key: 'avgResponseTime',
      render: (time: number) => `${Math.round(time)}秒`,
    },
    {
      title: '评分',
      dataIndex: 'avgRating',
      key: 'avgRating',
      sorter: (a, b) => a.avgRating - b.avgRating,
      render: (rating: number, record) => (
        <Tooltip title={`${record.totalRatings} 次评价`}>
          <span style={{ color: rating >= 4 ? '#52c41a' : rating >= 3 ? '#faad14' : '#ff4d4f' }}>
            ⭐ {rating.toFixed(1)}
          </span>
        </Tooltip>
      ),
    },
  ];

  // 评分分布渲染
  const renderRatingDistribution = () => {
    const totalRatings = ratingDistribution.reduce((sum, r) => sum + r.count, 0);
    if (totalRatings === 0) return <Empty description="暂无评分数据" />;

    return (
      <div>
        {[5, 4, 3, 2, 1].map((rating) => {
          const item = ratingDistribution.find((r) => r.rating === rating);
          const count = item?.count || 0;
          const percent = totalRatings > 0 ? (count / totalRatings) * 100 : 0;
          return (
            <div key={rating} style={{ marginBottom: 12 }}>
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                <span>⭐ {rating}</span>
                <span>{count} ({percent.toFixed(1)}%)</span>
              </Space>
              <Progress
                percent={percent}
                showInfo={false}
                strokeColor={rating >= 4 ? '#52c41a' : rating >= 3 ? '#faad14' : '#ff4d4f'}
              />
            </div>
          );
        })}
      </div>
    );
  };

  // 高峰时段热力图
  const renderPeakHoursHeatmap = () => {
    const maxCount = Math.max(...peakHours.map((h) => h.count), 1);

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {Array.from({ length: 24 }, (_, i) => {
          const hourData = peakHours.find((h) => h.hour === i);
          const count = hourData?.count || 0;
          const intensity = count / maxCount;
          const bgColor = `rgba(24, 144, 255, ${Math.max(0.1, intensity)})`;

          return (
            <Tooltip key={i} title={`${i}:00 - ${count} 个会话`}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: bgColor,
                  borderRadius: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color: intensity > 0.5 ? '#fff' : '#333',
                  cursor: 'pointer',
                  border: i === topPeakHour.hour ? '2px solid #ff4d4f' : 'none',
                }}
              >
                {i}
              </div>
            </Tooltip>
          );
        })}
      </div>
    );
  };

  // 会话趋势图（简单表格形式）
  const renderTrends = () => {
    if (trends.length === 0) return <Empty description="暂无趋势数据" />;

    const maxTotal = Math.max(...trends.map((t) => t.total), 1);

    return (
      <div>
        {trends.map((trend) => (
          <div key={trend.date} style={{ marginBottom: 8 }}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <span>{dayjs(trend.date).format('MM/DD')}</span>
              <Space>
                <Tag color="blue">{trend.total} 总计</Tag>
                <Tag color="green">{trend.resolved} 解决</Tag>
              </Space>
            </Space>
            <Progress
              percent={(trend.total / maxTotal) * 100}
              success={{ percent: (trend.resolved / maxTotal) * 100 }}
              showInfo={false}
            />
          </div>
        ))}
      </div>
    );
  };

  // 判断是否正在加载
  const isLoading = overviewLoading || trendsLoading || performanceLoading || ratingLoading || peakLoading;

  return (
    <ErrorBoundary boundaryName="AnalyticsDashboard">
    <div>
      <h2>
        <BarChartOutlined style={{ marginRight: 8 }} />
        数据统计
        <Tag
          icon={<ReloadOutlined spin={isLoading} />}
          color="processing"
          style={{ marginLeft: 12, cursor: 'pointer' }}
          onClick={() => refetchAll()}
        >
          Ctrl+R 刷新
        </Tag>
      </h2>

      {/* 筛选器 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space>
          <span>快速筛选:</span>
          <Select value={days} onChange={setDays} style={{ width: 120 }}>
            <Option value={7}>最近 7 天</Option>
            <Option value={14}>最近 14 天</Option>
            <Option value={30}>最近 30 天</Option>
          </Select>
          <span>自定义:</span>
          <RangePicker
            onChange={(dates) => {
              if (dates) {
                setDateRange([
                  dates[0]?.format('YYYY-MM-DD') || '',
                  dates[1]?.format('YYYY-MM-DD') || '',
                ]);
              } else {
                setDateRange(null);
              }
            }}
          />
        </Space>
      </Card>

      {/* 概览统计 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card loading={overviewLoading}>
            <Statistic
              title="会话总量"
              value={overview?.totalConversations || 0}
              prefix={<MessageOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={overviewLoading}>
            <Statistic
              title="解决率"
              value={((overview?.resolutionRate || 0) * 100).toFixed(1)}
              suffix="%"
              valueStyle={{
                color: (overview?.resolutionRate || 0) >= 0.8 ? '#52c41a' : '#faad14',
              }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={overviewLoading}>
            <Statistic
              title="平均响应时间"
              value={Math.round(overview?.avgResponseTime || 0)}
              suffix="秒"
              valueStyle={{
                color: (overview?.avgResponseTime || 0) <= 60 ? '#52c41a' : '#faad14',
              }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={overviewLoading}>
            <Statistic
              title="平均评分"
              value={(overview?.avgRating || 0).toFixed(1)}
              suffix="/ 5"
              valueStyle={{
                color: (overview?.avgRating || 0) >= 4 ? '#52c41a' : '#faad14',
              }}
              prefix={<StarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* 会话趋势 */}
        <Col span={12}>
          <Card
            title={
              <Space>
                <LineChartOutlined />
                会话趋势
              </Space>
            }
            loading={trendsLoading}
          >
            {renderTrends()}
          </Card>
        </Col>

        {/* 评分分布 */}
        <Col span={12}>
          <Card
            title={
              <Space>
                <StarOutlined />
                评分分布
              </Space>
            }
            loading={ratingLoading}
          >
            {renderRatingDistribution()}
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        {/* 客服绩效 */}
        <Col span={16}>
          <Card
            title={
              <Space>
                <UserOutlined />
                客服绩效排行
              </Space>
            }
          >
            <LoadingState
              loading={performanceLoading}
              error={performanceError}
              empty={!performanceLoading && !performanceError && agentPerformance.length === 0}
              onRetry={refetchAll}
              loadingType="skeleton"
              skeletonRows={5}
              emptyDescription="暂无绩效数据"
            >
              <Table
                columns={performanceColumns}
                dataSource={agentPerformance}
                rowKey="agentId"
                pagination={false}
                size="small"
              />
            </LoadingState>
          </Card>
        </Col>

        {/* 高峰时段 */}
        <Col span={8}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                高峰时段分布
              </Space>
            }
            extra={
              topPeakHour.count > 0 && (
                <Tag color="red">
                  高峰: {topPeakHour.hour}:00 ({topPeakHour.count}次)
                </Tag>
              )
            }
            loading={peakLoading}
          >
            {renderPeakHoursHeatmap()}
            <div style={{ marginTop: 12, fontSize: 12, color: '#999' }}>
              提示: 颜色越深表示会话越多，红框表示最高峰时段
            </div>
          </Card>
        </Col>
      </Row>
    </div>
    </ErrorBoundary>
  );
};

export default AnalyticsDashboard;
