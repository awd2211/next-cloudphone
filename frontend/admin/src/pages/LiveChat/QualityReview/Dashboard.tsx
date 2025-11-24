/**
 * 客服实时监控大屏
 *
 * 功能:
 * - 实时统计数据展示
 * - SLA 告警面板
 * - 客服状态一览
 * - 排队情况监控
 * - 自动刷新
 */
import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Badge,
  Tag,
  List,
  Avatar,
  Progress,
  Alert,
  Space,
  Typography,
  Button,
  Tooltip,
  Spin,
} from 'antd';
import {
  TeamOutlined,
  MessageOutlined,
  ClockCircleOutlined,
  SmileOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getAnalyticsOverview,
  getAgents,
  getQueueStats,
  getSlaStats,
  getActiveSlaAlerts,
  acknowledgeSlaAlert,
  type Agent,
  type SlaAlert,
  type SlaStats,
} from '@/services/livechat';
import { useSocketIO } from '@/hooks/useSocketIO';

const { Title, Text } = Typography;

// 状态颜色配置
const statusColors: Record<string, string> = {
  online: '#52c41a',
  busy: '#faad14',
  away: '#d9d9d9',
  offline: '#ff4d4f',
};

const severityColors: Record<string, string> = {
  warning: '#faad14',
  critical: '#ff4d4f',
};

const LiveChatDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const { socket } = useSocketIO();

  // 获取概览数据
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['livechat-overview'],
    queryFn: getAnalyticsOverview,
    refetchInterval: 10000, // 10秒刷新
  });

  // 获取客服列表
  const { data: agents = [], isLoading: agentsLoading } = useQuery({
    queryKey: ['livechat-agents'],
    queryFn: () => getAgents(),
    refetchInterval: 15000, // 15秒刷新
  });

  // 获取排队统计
  const { data: queueStats } = useQuery({
    queryKey: ['livechat-queue-stats'],
    queryFn: getQueueStats,
    refetchInterval: 5000, // 5秒刷新
  });

  // 获取 SLA 统计
  const { data: slaStats } = useQuery({
    queryKey: ['livechat-sla-stats'],
    queryFn: getSlaStats,
    refetchInterval: 30000, // 30秒刷新
  });

  // 获取活跃告警
  const { data: activeAlerts = [] } = useQuery({
    queryKey: ['livechat-active-alerts'],
    queryFn: getActiveSlaAlerts,
    refetchInterval: 10000, // 10秒刷新
  });

  // 确认告警
  const acknowledgeMutation = useMutation({
    mutationFn: acknowledgeSlaAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livechat-active-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['livechat-sla-stats'] });
    },
  });

  // WebSocket 实时更新
  useEffect(() => {
    if (!socket) return;

    socket.on('sla_alert', () => {
      queryClient.invalidateQueries({ queryKey: ['livechat-active-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['livechat-sla-stats'] });
    });

    socket.on('conversation_created', () => {
      queryClient.invalidateQueries({ queryKey: ['livechat-overview'] });
      queryClient.invalidateQueries({ queryKey: ['livechat-queue-stats'] });
    });

    socket.on('agent_status_changed', () => {
      queryClient.invalidateQueries({ queryKey: ['livechat-agents'] });
    });

    return () => {
      socket.off('sla_alert');
      socket.off('conversation_created');
      socket.off('agent_status_changed');
    };
  }, [socket, queryClient]);

  // 更新时间戳
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 全屏切换
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // 在线客服统计
  const onlineAgents = agents.filter((a) => a.status === 'online' || a.status === 'busy');
  const busyAgents = agents.filter((a) => a.status === 'busy');
  const totalCapacity = agents.reduce((sum, a) => sum + a.maxConcurrentChats, 0);
  const currentLoad = agents.reduce((sum, a) => sum + a.currentChats, 0);
  const loadPercent = totalCapacity > 0 ? Math.round((currentLoad / totalCapacity) * 100) : 0;

  // 指标名称映射
  const metricNames: Record<string, string> = {
    first_response_time: '首响时间',
    avg_response_time: '平均响应',
    resolution_time: '解决时间',
    wait_time: '等待时间',
    queue_length: '排队数量',
    satisfaction_rate: '满意度',
    resolution_rate: '解决率',
  };

  if (overviewLoading || agentsLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: isFullscreen ? 24 : 0,
        background: isFullscreen ? '#001529' : 'transparent',
        minHeight: isFullscreen ? '100vh' : 'auto',
      }}
    >
      {/* 头部 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0, color: isFullscreen ? '#fff' : undefined }}>
            <TeamOutlined /> 客服实时监控
          </Title>
          <Text type="secondary" style={{ color: isFullscreen ? '#8c8c8c' : undefined }}>
            最后更新: {dayjs(lastUpdate).format('HH:mm:ss')}
          </Text>
        </div>
        <Space>
          <Button
            icon={<SyncOutlined spin={overviewLoading} />}
            onClick={() => {
              queryClient.invalidateQueries();
              setLastUpdate(new Date());
            }}
          >
            刷新
          </Button>
          <Button
            icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            onClick={toggleFullscreen}
          >
            {isFullscreen ? '退出全屏' : '全屏'}
          </Button>
        </Space>
      </div>

      {/* 核心指标卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="今日会话"
              value={overview?.totalConversations || 0}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="排队等待"
              value={queueStats?.waitingCount || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: (queueStats?.waitingCount || 0) > 10 ? '#ff4d4f' : '#52c41a' }}
            />
            {(queueStats?.waitingCount || 0) > 10 && (
              <Text type="danger" style={{ fontSize: 12 }}>
                <WarningOutlined /> 排队人数较多
              </Text>
            )}
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="平均响应"
              value={Math.round(overview?.avgResponseTime || 0)}
              suffix="秒"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: (overview?.avgResponseTime || 0) > 60 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="满意度"
              value={(overview?.avgRating || 0).toFixed(1)}
              suffix="/ 5"
              prefix={<SmileOutlined />}
              valueStyle={{ color: (overview?.avgRating || 0) >= 4 ? '#52c41a' : '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* SLA 告警 */}
      {activeAlerts.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={24}>
            <Card
              title={
                <Space>
                  <BellOutlined style={{ color: '#ff4d4f' }} />
                  <span>SLA 告警 ({activeAlerts.length})</span>
                </Space>
              }
              bodyStyle={{ padding: 12 }}
            >
              <List
                dataSource={activeAlerts.slice(0, 5)}
                renderItem={(alert: SlaAlert) => (
                  <Alert
                    key={alert.id}
                    type={alert.severity === 'critical' ? 'error' : 'warning'}
                    message={
                      <Space>
                        <Tag color={severityColors[alert.severity]}>
                          {alert.severity === 'critical' ? '严重' : '警告'}
                        </Tag>
                        {alert.message || `${metricNames[alert.metricType]} 超过阈值`}
                      </Space>
                    }
                    description={
                      <Space>
                        <Text type="secondary">
                          当前值: {alert.currentValue.toFixed(1)} / 阈值: {alert.thresholdValue}
                        </Text>
                        <Button
                          size="small"
                          type="link"
                          onClick={() => acknowledgeMutation.mutate(alert.id)}
                          loading={acknowledgeMutation.isPending}
                        >
                          确认
                        </Button>
                      </Space>
                    }
                    showIcon
                    style={{ marginBottom: 8 }}
                  />
                )}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* 客服状态 */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <TeamOutlined />
                <span>客服状态</span>
                <Tag color="blue">{onlineAgents.length} / {agents.length} 在线</Tag>
              </Space>
            }
          >
            <Row gutter={[16, 8]} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Statistic
                  title="在线"
                  value={onlineAgents.length}
                  valueStyle={{ color: '#52c41a', fontSize: 24 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="忙碌"
                  value={busyAgents.length}
                  valueStyle={{ color: '#faad14', fontSize: 24 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="负载"
                  value={loadPercent}
                  suffix="%"
                  valueStyle={{ color: loadPercent > 80 ? '#ff4d4f' : '#1890ff', fontSize: 24 }}
                />
              </Col>
            </Row>

            <Progress
              percent={loadPercent}
              status={loadPercent > 80 ? 'exception' : 'active'}
              strokeColor={loadPercent > 80 ? '#ff4d4f' : loadPercent > 60 ? '#faad14' : '#52c41a'}
            />

            <List
              size="small"
              dataSource={agents.slice(0, 6)}
              renderItem={(agent: Agent) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                      <Badge dot color={statusColors[agent.status]} offset={[-4, 28]}>
                        <Avatar icon={<UserOutlined />} />
                      </Badge>
                    }
                    title={agent.displayName}
                    description={
                      <Space>
                        <Text type="secondary">
                          {agent.currentChats}/{agent.maxConcurrentChats} 会话
                        </Text>
                        {agent.rating > 0 && (
                          <Tag color="gold">★ {agent.rating.toFixed(1)}</Tag>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* SLA 指标 */}
        <Col xs={24} md={12}>
          <Card
            title={
              <Space>
                <ExclamationCircleOutlined />
                <span>SLA 指标</span>
                {slaStats && slaStats.criticalAlerts > 0 && (
                  <Tag color="red">{slaStats.criticalAlerts} 严重告警</Tag>
                )}
              </Space>
            }
          >
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Statistic
                  title="活跃告警"
                  value={slaStats?.activeAlerts || 0}
                  valueStyle={{
                    color: (slaStats?.activeAlerts || 0) > 0 ? '#ff4d4f' : '#52c41a',
                    fontSize: 24,
                  }}
                  prefix={(slaStats?.activeAlerts || 0) > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="警告"
                  value={slaStats?.warningAlerts || 0}
                  valueStyle={{ color: '#faad14', fontSize: 24 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="今日解决"
                  value={slaStats?.resolvedToday || 0}
                  valueStyle={{ color: '#52c41a', fontSize: 24 }}
                />
              </Col>
            </Row>

            {slaStats?.metrics && (
              <div style={{ marginTop: 16 }}>
                <Text strong>当前指标</Text>
                <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                  {Object.entries(slaStats.metrics).slice(0, 6).map(([key, value]) => (
                    <Col span={12} key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text type="secondary">{metricNames[key] || key}</Text>
                        <Text>
                          {typeof value === 'number' ? (
                            key.includes('rate') ? `${value.toFixed(1)}%` :
                            key.includes('time') ? `${Math.round(value)}s` :
                            Math.round(value)
                          ) : value}
                        </Text>
                      </div>
                    </Col>
                  ))}
                </Row>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* 排队监控 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                <span>排队监控</span>
              </Space>
            }
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Statistic
                  title="当前排队"
                  value={queueStats?.waitingCount || 0}
                  suffix="人"
                  valueStyle={{
                    fontSize: 32,
                    color: (queueStats?.waitingCount || 0) > 20 ? '#ff4d4f' :
                           (queueStats?.waitingCount || 0) > 10 ? '#faad14' : '#52c41a',
                  }}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="平均等待"
                  value={Math.round((queueStats?.avgWaitTime || 0) / 60)}
                  suffix="分钟"
                  valueStyle={{ fontSize: 32 }}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title="最长等待"
                  value={Math.round((queueStats?.maxWaitTime || 0) / 60)}
                  suffix="分钟"
                  valueStyle={{
                    fontSize: 32,
                    color: (queueStats?.maxWaitTime || 0) > 300 ? '#ff4d4f' : undefined,
                  }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default LiveChatDashboard;
