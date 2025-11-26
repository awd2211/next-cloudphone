import { useState, useEffect, useMemo } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Table,
  Tag,
  Typography,
  Space,
  Progress,
  Alert,
  Steps,
  Button,
  Tooltip,
  Badge,
  Timeline,
  Segmented,
} from 'antd';
import {
  MobileOutlined,
  GlobalOutlined,
  MessageOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined,
  QuestionCircleOutlined,
  CloseOutlined,
  RocketOutlined,
  SettingOutlined,
  SafetyOutlined,
  ReloadOutlined,
  RiseOutlined,
  FallOutlined,
  AreaChartOutlined,
  HistoryOutlined,
  SyncOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Area, Pie, Column } from '@ant-design/charts';
import { deviceApi, proxyApi, smsApi } from '@/services/api';
import type { Device, VerificationCode } from '@/types';
import { useTheme } from '@/contexts/ThemeContext';
import { DashboardSkeleton } from '@/components/Skeletons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title, Text } = Typography;

// 模拟趋势数据 - 用于图表
const generateTrendData = () => {
  const data: { date: string; value: number; category: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = dayjs().subtract(i, 'day').format('MM-DD');
    const devices = Math.floor(Math.random() * 5 + 3);
    const sms = Math.floor(Math.random() * 20 + 5);
    const bandwidth = Math.floor(Math.random() * 500 + 200);

    data.push({ date, value: devices, category: '设备数' });
    data.push({ date, value: sms, category: '验证码' });
    data.push({ date, value: Math.floor(bandwidth / 10), category: '带宽(GB)' });
  }
  return data;
};

// 生成设备状态饼图数据
const generateDeviceStatusData = (stats: { running?: number; stopped?: number; error?: number }) => [
  { type: '运行中', value: stats?.running || 0 },
  { type: '已停止', value: stats?.stopped || 0 },
  { type: '异常', value: stats?.error || 0 },
];

// 生成代理国家分布数据
const generateProxyCountryData = () => [
  { country: '美国', count: Math.floor(Math.random() * 30 + 20) },
  { country: '日本', count: Math.floor(Math.random() * 25 + 15) },
  { country: '韩国', count: Math.floor(Math.random() * 20 + 10) },
  { country: '新加坡', count: Math.floor(Math.random() * 18 + 8) },
  { country: '德国', count: Math.floor(Math.random() * 15 + 5) },
  { country: '英国', count: Math.floor(Math.random() * 12 + 5) },
];

// 生成每小时流量数据
const generateHourlyTrafficData = () => {
  const data: { hour: string; traffic: number }[] = [];
  for (let i = 23; i >= 0; i--) {
    data.push({
      hour: dayjs().subtract(i, 'hour').format('HH:00'),
      traffic: Math.floor(Math.random() * 100 + 20),
    });
  }
  return data;
};

// 模拟活动日志
const generateActivityLog = () => [
  { time: dayjs().subtract(2, 'minute').toDate(), action: '设备 CloudPhone-001 启动成功', type: 'success' },
  { time: dayjs().subtract(8, 'minute').toDate(), action: '收到 Google 验证码 485923', type: 'info' },
  { time: dayjs().subtract(15, 'minute').toDate(), action: '代理 45.76.123.45 配置到设备', type: 'success' },
  { time: dayjs().subtract(25, 'minute').toDate(), action: '设备 CloudPhone-003 停止', type: 'warning' },
  { time: dayjs().subtract(40, 'minute').toDate(), action: '收到 Facebook 验证码 736159', type: 'info' },
  { time: dayjs().subtract(55, 'minute').toDate(), action: '新设备 CloudPhone-005 创建', type: 'success' },
];

const Dashboard = () => {
  const { isDark } = useTheme();
  const [showGuide, setShowGuide] = useState(() => {
    const hasSeenGuide = localStorage.getItem('gv-guide-seen');
    return !hasSeenGuide;
  });
  const [currentTime, setCurrentTime] = useState(dayjs());
  const [viewMode, setViewMode] = useState<string | number>('overview');

  // 实时时钟
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(dayjs()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCloseGuide = () => {
    setShowGuide(false);
    localStorage.setItem('gv-guide-seen', 'true');
  };

  // 获取统计数据 - 带自动刷新
  const { data: deviceStats, refetch: refetchDeviceStats, isRefetching: isDeviceRefetching, isLoading: isDeviceLoading } = useQuery({
    queryKey: ['deviceStats'],
    queryFn: deviceApi.stats,
    refetchInterval: 30000, // 30秒自动刷新
  });

  const { data: proxyStats, refetch: refetchProxyStats, isRefetching: isProxyRefetching, isLoading: isProxyLoading } = useQuery({
    queryKey: ['proxyStats'],
    queryFn: proxyApi.stats,
    refetchInterval: 30000,
  });

  const { data: devices, refetch: refetchDevices, isLoading: isDevicesLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceApi.list({ page: 1, pageSize: 5 }),
    refetchInterval: 30000,
  });

  const { data: smsCodes, refetch: refetchSms, isLoading: isSmsLoading } = useQuery({
    queryKey: ['smsCodes'],
    queryFn: () => smsApi.list({ page: 1, pageSize: 5 }),
    refetchInterval: 15000, // SMS 更频繁刷新
  });

  // 是否正在初始加载
  const isInitialLoading = isDeviceLoading || isProxyLoading || isDevicesLoading || isSmsLoading;

  // 计算运行率
  const runningRate = useMemo(() => {
    if (!deviceStats?.total) return 0;
    return Math.round((deviceStats.running / deviceStats.total) * 100);
  }, [deviceStats]);

  // 计算代理使用率
  const proxyUsageRate = useMemo(() => {
    if (!proxyStats?.total) return 0;
    return Math.round((proxyStats.active / proxyStats.total) * 100);
  }, [proxyStats]);

  // 趋势数据
  const trendData = useMemo(() => generateTrendData(), []);
  const activityLog = useMemo(() => generateActivityLog(), []);

  // 图表数据
  const deviceStatusData = useMemo(
    () => generateDeviceStatusData(deviceStats || {}),
    [deviceStats]
  );
  const proxyCountryData = useMemo(() => generateProxyCountryData(), []);
  const hourlyTrafficData = useMemo(() => generateHourlyTrafficData(), []);

  // 图表主题配置
  const chartTheme = useMemo(
    () => (isDark ? 'classicDark' : 'classic'),
    [isDark]
  );

  // 刷新所有数据
  const handleRefreshAll = () => {
    refetchDeviceStats();
    refetchProxyStats();
    refetchDevices();
    refetchSms();
  };

  // 设备状态颜色映射
  const getStatusTag = (status: Device['status']) => {
    const statusMap: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      running: { color: 'success', text: '运行中', icon: <CheckCircleOutlined /> },
      stopped: { color: 'default', text: '已停止', icon: <ClockCircleOutlined /> },
      starting: { color: 'processing', text: '启动中', icon: <SyncOutlined spin /> },
      stopping: { color: 'warning', text: '停止中', icon: <SyncOutlined spin /> },
      error: { color: 'error', text: '异常', icon: <WarningOutlined /> },
      unknown: { color: 'default', text: '未知', icon: null },
    };
    const config = statusMap[status] || statusMap.unknown;
    return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
  };

  // 设备列表列定义
  const deviceColumns = [
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (name: string) => (
        <Space>
          <MobileOutlined style={{ color: '#1677ff' }} />
          <span style={{ fontWeight: 500 }}>{name}</span>
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: Device['status']) => getStatusTag(status),
    },
    {
      title: 'Android',
      dataIndex: 'androidVersion',
      key: 'androidVersion',
      width: 100,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '代理',
      dataIndex: 'proxyId',
      key: 'proxyId',
      width: 80,
      render: (proxyId?: string) =>
        proxyId ? (
          <Badge status="processing" text="已配置" />
        ) : (
          <Badge status="default" text="无" />
        ),
    },
  ];

  // 验证码列表列定义
  const smsColumns = [
    {
      title: '手机号',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      ellipsis: true,
      render: (phone: string) => (
        <Text style={{ fontFamily: 'monospace', fontSize: 12 }}>{phone}</Text>
      ),
    },
    {
      title: '验证码',
      dataIndex: 'code',
      key: 'code',
      width: 90,
      render: (code: string) => (
        <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 600 }}>
          {code}
        </Tag>
      ),
    },
    {
      title: '来源',
      dataIndex: 'sender',
      key: 'sender',
      width: 80,
      render: (sender: string) => <Tag>{sender}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'used',
      key: 'used',
      width: 70,
      render: (used: boolean) => (
        <Tag color={used ? 'default' : 'success'}>{used ? '已用' : '可用'}</Tag>
      ),
    },
  ];

  // 初始加载时显示骨架屏
  if (isInitialLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div>
      {/* 页面标题区域 */}
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            工作台
          </Title>
          <Text type="secondary">欢迎使用境外移动集群察打一体平台</Text>
        </div>

        <Space>
          {!showGuide && (
            <Button size="small" type="text" onClick={() => setShowGuide(true)}>
              <QuestionCircleOutlined /> 使用说明
            </Button>
          )}
          <Tooltip title="刷新所有数据">
            <Button
              icon={<ReloadOutlined spin={isDeviceRefetching || isProxyRefetching} />}
              onClick={handleRefreshAll}
            >
              刷新
            </Button>
          </Tooltip>
          <div
            style={{
              padding: '4px 12px',
              background: '#001529',
              borderRadius: 4,
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: 14,
            }}
          >
            {currentTime.format('YYYY-MM-DD HH:mm:ss')}
          </div>
        </Space>
      </div>

      {/* 使用说明卡片 */}
      {showGuide && (
        <Card
          title={
            <Space>
              <RocketOutlined style={{ color: '#1677ff' }} />
              <span>平台使用说明</span>
              <Tag color="blue">演示版</Tag>
            </Space>
          }
          extra={
            <Button type="text" onClick={handleCloseGuide}>
              <CloseOutlined /> 关闭
            </Button>
          }
          style={{ marginBottom: 24 }}
          styles={{ body: { paddingBottom: 16 } }}
        >
          <Alert
            message="本系统为演示环境，所有数据均为模拟数据，不会产生真实操作"
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Row gutter={[24, 16]}>
            <Col xs={24} lg={12}>
              <Title level={5} style={{ marginBottom: 16 }}>
                <SafetyOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                核心功能介绍
              </Title>
              <Steps
                direction="vertical"
                size="small"
                current={-1}
                items={[
                  {
                    title: '云手机管理',
                    description: '管理境外云端Android设备，支持批量启动/停止、远程控制、代理配置等功能',
                    icon: <MobileOutlined style={{ color: '#1677ff' }} />,
                  },
                  {
                    title: '家宽代理',
                    description: '为云手机配置真实住宅IP代理，支持多国家/地区选择，提高业务成功率',
                    icon: <GlobalOutlined style={{ color: '#52c41a' }} />,
                  },
                  {
                    title: '验证码接收',
                    description: '自动接收并提取应用验证码，支持多种应用类型，一键复制使用',
                    icon: <MessageOutlined style={{ color: '#722ed1' }} />,
                  },
                ]}
              />
            </Col>

            <Col xs={24} lg={12}>
              <Title level={5} style={{ marginBottom: 16 }}>
                <SettingOutlined style={{ color: '#faad14', marginRight: 8 }} />
                快速上手指南
              </Title>
              <div style={{ background: '#fafafa', padding: 16, borderRadius: 8 }}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div>
                    <Text strong>1. 设备管理</Text>
                    <br />
                    <Text type="secondary">
                      进入「设备管理」页面，可查看所有云手机状态，点击「启动」按钮开启设备
                    </Text>
                  </div>
                  <div>
                    <Text strong>2. 配置代理</Text>
                    <br />
                    <Text type="secondary">
                      在设备列表中点击「配置代理」，选择目标国家的住宅IP为设备分配代理
                    </Text>
                  </div>
                  <div>
                    <Text strong>3. 验证码接收</Text>
                    <br />
                    <Text type="secondary">
                      进入「验证码接收」页面，输入手机号查询最新验证码，支持一键复制
                    </Text>
                  </div>
                </Space>
              </div>
            </Col>
          </Row>

          <div
            style={{
              marginTop: 16,
              padding: '12px 16px',
              background: '#f6ffed',
              borderRadius: 8,
              border: '1px solid #b7eb8f',
            }}
          >
            <Text>
              <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
              <Text strong>演示账号：</Text> admin / admin123 &nbsp;&nbsp;|&nbsp;&nbsp;
              <Text strong>技术支持：</Text> support@cloudphone.run
            </Text>
          </div>
        </Card>
      )}

      {/* 统计卡片 - 增强版 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            style={{ cursor: 'default' }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Statistic
              title={
                <Space>
                  <MobileOutlined style={{ color: '#1677ff' }} />
                  <span>设备总数</span>
                </Space>
              }
              value={deviceStats?.total || 0}
              valueStyle={{ color: '#1677ff', fontSize: 32 }}
            />
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">运行率</Text>
                <Text strong style={{ color: runningRate >= 80 ? '#52c41a' : '#faad14' }}>
                  {runningRate}%
                </Text>
              </div>
              <Progress
                percent={runningRate}
                size="small"
                strokeColor={runningRate >= 80 ? '#52c41a' : '#faad14'}
                showInfo={false}
              />
              <Space style={{ marginTop: 8 }} split={<span style={{ color: '#d9d9d9' }}>|</span>}>
                <Text style={{ color: '#52c41a', fontSize: 12 }}>
                  <CheckCircleOutlined /> {deviceStats?.running || 0}
                </Text>
                <Text style={{ color: '#999', fontSize: 12 }}>
                  <ClockCircleOutlined /> {deviceStats?.stopped || 0}
                </Text>
                {(deviceStats?.error || 0) > 0 && (
                  <Text style={{ color: '#ff4d4f', fontSize: 12 }}>
                    <WarningOutlined /> {deviceStats?.error}
                  </Text>
                )}
              </Space>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            style={{ cursor: 'default' }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Statistic
              title={
                <Space>
                  <GlobalOutlined style={{ color: '#52c41a' }} />
                  <span>代理资源</span>
                </Space>
              }
              value={proxyStats?.total || 0}
              valueStyle={{ color: '#52c41a', fontSize: 32 }}
            />
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">使用率</Text>
                <Text strong style={{ color: proxyUsageRate >= 80 ? '#faad14' : '#52c41a' }}>
                  {proxyUsageRate}%
                </Text>
              </div>
              <Progress
                percent={proxyUsageRate}
                size="small"
                strokeColor={proxyUsageRate >= 80 ? '#faad14' : '#52c41a'}
                showInfo={false}
              />
              <Space style={{ marginTop: 8 }} split={<span style={{ color: '#d9d9d9' }}>|</span>}>
                <Text style={{ color: '#1677ff', fontSize: 12 }}>使用中 {proxyStats?.active || 0}</Text>
                <Text style={{ color: '#52c41a', fontSize: 12 }}>
                  可用 {(proxyStats?.total || 0) - (proxyStats?.active || 0)}
                </Text>
              </Space>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            style={{ cursor: 'default' }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Statistic
              title={
                <Space>
                  <MessageOutlined style={{ color: '#722ed1' }} />
                  <span>今日验证码</span>
                </Space>
              }
              value={smsCodes?.total || 0}
              valueStyle={{ color: '#722ed1', fontSize: 32 }}
              suffix={
                <Tooltip title="较昨日增长">
                  <span style={{ fontSize: 14, color: '#52c41a' }}>
                    <RiseOutlined /> +12%
                  </span>
                </Tooltip>
              }
            />
            <div style={{ marginTop: 16 }}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>最近 24 小时接收</Text>
                  <Text style={{ fontSize: 12, color: '#52c41a' }}>
                    {(smsCodes?.data?.filter((c: VerificationCode) => !c.used).length || 0)} 条可用
                  </Text>
                </div>
                <Progress
                  percent={75}
                  size="small"
                  strokeColor="#722ed1"
                  showInfo={false}
                />
              </Space>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            style={{ cursor: 'default' }}
            styles={{ body: { padding: '20px 24px' } }}
          >
            <Statistic
              title={
                <Space>
                  <ThunderboltOutlined style={{ color: '#faad14' }} />
                  <span>带宽消耗</span>
                </Space>
              }
              value={proxyStats?.totalBandwidthUsed || 0}
              suffix="MB"
              valueStyle={{ color: '#faad14', fontSize: 32 }}
            />
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text type="secondary">本月配额</Text>
                <Text strong>45% / 100GB</Text>
              </div>
              <Progress percent={45} size="small" strokeColor="#faad14" status="active" />
              <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                剩余 55GB 可用
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 视图切换 */}
      <div style={{ marginBottom: 16 }}>
        <Segmented
          options={[
            { label: '概览', value: 'overview', icon: <AreaChartOutlined /> },
            { label: '活动日志', value: 'activity', icon: <HistoryOutlined /> },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />
      </div>

      {/* 内容区域 */}
      {viewMode === 'overview' ? (
        <>
          {/* 图表区域 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {/* 7日趋势图 */}
            <Col xs={24} lg={16}>
              <Card
                title={
                  <Space>
                    <AreaChartOutlined style={{ color: '#1677ff' }} />
                    <span>7日趋势</span>
                  </Space>
                }
              >
                <Area
                  data={trendData}
                  xField="date"
                  yField="value"
                  colorField="category"
                  height={280}
                  theme={chartTheme}
                  smooth
                  stack
                  style={{ fillOpacity: 0.6 }}
                  legend={{
                    position: 'top-right',
                  }}
                  tooltip={{
                    title: (d) => `日期: ${d.date}`,
                  }}
                />
              </Card>
            </Col>

            {/* 设备状态分布 */}
            <Col xs={24} lg={8}>
              <Card
                title={
                  <Space>
                    <PieChartOutlined style={{ color: '#52c41a' }} />
                    <span>设备状态分布</span>
                  </Space>
                }
              >
                <Pie
                  data={deviceStatusData}
                  angleField="value"
                  colorField="type"
                  height={280}
                  theme={chartTheme}
                  innerRadius={0.6}
                  label={{
                    text: 'value',
                    position: 'outside',
                  }}
                  legend={{
                    position: 'bottom',
                  }}
                  style={{
                    stroke: isDark ? '#1f1f1f' : '#fff',
                    lineWidth: 2,
                  }}
                  annotations={[
                    {
                      type: 'text',
                      style: {
                        text: `${deviceStats?.total || 0}`,
                        x: '50%',
                        y: '45%',
                        textAlign: 'center',
                        fontSize: 28,
                        fontWeight: 'bold',
                        fill: isDark ? '#e6e6e6' : '#333',
                      },
                    },
                    {
                      type: 'text',
                      style: {
                        text: '设备总数',
                        x: '50%',
                        y: '55%',
                        textAlign: 'center',
                        fontSize: 12,
                        fill: isDark ? '#999' : '#666',
                      },
                    },
                  ]}
                />
              </Card>
            </Col>
          </Row>

          {/* 第二行图表 */}
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {/* 代理国家分布 */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <GlobalOutlined style={{ color: '#722ed1' }} />
                    <span>代理国家分布</span>
                  </Space>
                }
              >
                <Column
                  data={proxyCountryData}
                  xField="country"
                  yField="count"
                  height={220}
                  theme={chartTheme}
                  style={{
                    fill: ({ country }) => {
                      const colors = ['#1677ff', '#52c41a', '#722ed1', '#faad14', '#f5222d', '#13c2c2'];
                      const index = proxyCountryData.findIndex((d) => d.country === country);
                      return colors[index % colors.length];
                    },
                    radius: 4,
                  }}
                  label={{
                    text: 'count',
                    position: 'top',
                    style: {
                      fill: isDark ? '#e6e6e6' : '#333',
                    },
                  }}
                />
              </Card>
            </Col>

            {/* 24小时流量趋势 */}
            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <ThunderboltOutlined style={{ color: '#faad14' }} />
                    <span>24小时流量趋势</span>
                  </Space>
                }
              >
                <Area
                  data={hourlyTrafficData}
                  xField="hour"
                  yField="traffic"
                  height={220}
                  theme={chartTheme}
                  smooth
                  style={{
                    fill: 'linear-gradient(90deg, #faad14 0%, #ff7a45 100%)',
                    fillOpacity: 0.4,
                  }}
                  line={{
                    style: {
                      stroke: '#faad14',
                      strokeWidth: 2,
                    },
                  }}
                  axis={{
                    x: {
                      label: {
                        autoRotate: true,
                        style: {
                          fontSize: 10,
                        },
                      },
                    },
                  }}
                />
              </Card>
            </Col>
          </Row>

          {/* 数据表格 */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <MobileOutlined style={{ color: '#1677ff' }} />
                    <span>最近设备</span>
                  </Space>
                }
                extra={<a href="/devices">查看全部</a>}
                styles={{ body: { padding: 0 } }}
              >
                <Table<Device>
                  columns={deviceColumns}
                  dataSource={devices?.data || []}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <MessageOutlined style={{ color: '#722ed1' }} />
                    <span>最新验证码</span>
                    <Badge count={smsCodes?.data?.filter((c: VerificationCode) => !c.used).length || 0} />
                  </Space>
                }
                extra={<a href="/sms">查看全部</a>}
                styles={{ body: { padding: 0 } }}
              >
                <Table<VerificationCode>
                  columns={smsColumns}
                  dataSource={smsCodes?.data || []}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          </Row>
        </>
      ) : (
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card
              title={
                <Space>
                  <HistoryOutlined style={{ color: '#1677ff' }} />
                  <span>系统活动日志</span>
                </Space>
              }
            >
              <Timeline
                items={activityLog.map((log) => ({
                  color:
                    log.type === 'success' ? 'green' : log.type === 'warning' ? 'orange' : 'blue',
                  children: (
                    <div>
                      <Text>{log.action}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {dayjs(log.time).fromNow()}
                      </Text>
                    </div>
                  ),
                }))}
              />
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <AreaChartOutlined style={{ color: '#52c41a' }} />
                  <span>7日趋势图表</span>
                </Space>
              }
            >
              <Area
                data={trendData}
                xField="date"
                yField="value"
                colorField="category"
                height={300}
                theme={chartTheme}
                smooth
                style={{ fillOpacity: 0.5 }}
                legend={{
                  position: 'bottom',
                }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 底部信息 */}
      <div
        style={{
          marginTop: 24,
          padding: '16px 24px',
          background: isDark ? '#1f1f1f' : '#fff',
          borderRadius: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          transition: 'background 0.3s',
        }}
      >
        <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
          <Text type="secondary">数据每 30 秒自动刷新</Text>
          <Text type="secondary">最后更新: {currentTime.format('HH:mm:ss')}</Text>
        </Space>
        <Text type="secondary">
          境外移动集群察打一体平台 v1.0.0 | 技术支持: support@cloudphone.run
        </Text>
      </div>
    </div>
  );
};

export default Dashboard;
