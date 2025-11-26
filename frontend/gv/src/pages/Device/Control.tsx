/**
 * 设备群控页面
 *
 * 功能：
 * - 展示所有设备的实时投屏画面
 * - 支持一键连接/断开所有设备
 * - 支持批量操作（启动、停止）
 * - 响应式网格布局
 * - 设备状态筛选
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Statistic,
  Select,
  Input,
  Tag,
  Empty,
  Spin,
  Tooltip,
  Modal,
  message,
  Segmented,
  Typography,
  Badge,
  Popconfirm,
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SearchOutlined,
  DesktopOutlined,
  MobileOutlined,
  WifiOutlined,
  CloudServerOutlined,
  AppstoreOutlined,
  BarsOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LinkOutlined,
  DisconnectOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceApi, proxyApi } from '@/services/api';
import DevicePlayerCard from '@/components/DevicePlayerCard';
import type { Device, ProxyConfig } from '@/types';

const { Title, Text } = Typography;
const { Option } = Select;

// 布局配置
const LAYOUT_CONFIGS = {
  small: { cols: { xs: 12, sm: 8, md: 6, lg: 4, xl: 3 } },
  medium: { cols: { xs: 24, sm: 12, md: 8, lg: 6, xl: 4 } },
  large: { cols: { xs: 24, sm: 24, md: 12, lg: 8, xl: 6 } },
};

type LayoutSize = 'small' | 'medium' | 'large';
type StatusFilter = 'all' | 'running' | 'stopped' | 'error';

const DeviceControl = () => {
  const queryClient = useQueryClient();

  // 状态
  const [layoutSize, setLayoutSize] = useState<LayoutSize>('medium');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('running');
  const [searchText, setSearchText] = useState('');
  const [autoConnect, setAutoConnect] = useState(true);
  const [connectedCount, setConnectedCount] = useState(0);
  const [proxyModalVisible, setProxyModalVisible] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // 查询设备列表
  const { data: devicesData, isLoading, refetch } = useQuery({
    queryKey: ['devices'],
    queryFn: () => deviceApi.list({ page: 1, pageSize: 100 }),
    refetchInterval: 10000, // 每10秒刷新
  });

  // 查询统计
  const { data: stats } = useQuery({
    queryKey: ['device-stats'],
    queryFn: deviceApi.stats,
    refetchInterval: 10000,
  });

  // 查询可用代理
  const { data: proxiesData } = useQuery({
    queryKey: ['proxies'],
    queryFn: () => proxyApi.list({ page: 1, pageSize: 200 }),
  });

  // 启动设备
  const startMutation = useMutation({
    mutationFn: deviceApi.start,
    onSuccess: () => {
      message.success('设备启动中');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device-stats'] });
    },
    onError: () => {
      message.error('启动失败');
    },
  });

  // 停止设备
  const stopMutation = useMutation({
    mutationFn: deviceApi.stop,
    onSuccess: () => {
      message.success('设备已停止');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device-stats'] });
    },
    onError: () => {
      message.error('停止失败');
    },
  });

  // 删除设备
  const deleteMutation = useMutation({
    mutationFn: deviceApi.delete,
    onSuccess: () => {
      message.success('设备已删除');
      queryClient.invalidateQueries({ queryKey: ['devices'] });
      queryClient.invalidateQueries({ queryKey: ['device-stats'] });
    },
    onError: () => {
      message.error('删除失败');
    },
  });

  // 配置代理
  const setProxyMutation = useMutation({
    mutationFn: ({ deviceId, proxyId }: { deviceId: string; proxyId: string }) =>
      deviceApi.setProxy(deviceId, proxyId),
    onSuccess: () => {
      message.success('代理配置成功');
      setProxyModalVisible(false);
      setSelectedDevice(null);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
    onError: () => {
      message.error('代理配置失败');
    },
  });

  // 过滤设备
  const filteredDevices = useMemo(() => {
    if (!devicesData?.data) return [];

    return devicesData.data.filter((device) => {
      // 状态筛选
      if (statusFilter !== 'all' && device.status !== statusFilter) {
        return false;
      }

      // 搜索筛选
      if (searchText && !device.name.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [devicesData?.data, statusFilter, searchText]);

  // 运行中的设备数量
  const runningDevices = useMemo(() => {
    return devicesData?.data?.filter((d) => d.status === 'running') || [];
  }, [devicesData?.data]);

  // 处理设备操作
  const handleDeviceAction = useCallback((action: string, device: Device) => {
    switch (action) {
      case 'start':
        startMutation.mutate(device.id);
        break;
      case 'stop':
        Modal.confirm({
          title: '停止设备',
          content: `确定要停止设备 ${device.name} 吗？`,
          onOk: () => stopMutation.mutate(device.id),
        });
        break;
      case 'delete':
        Modal.confirm({
          title: '删除设备',
          content: `确定要删除设备 ${device.name} 吗？此操作不可恢复。`,
          okType: 'danger',
          onOk: () => deleteMutation.mutate(device.id),
        });
        break;
      case 'proxy':
        setSelectedDevice(device);
        setProxyModalVisible(true);
        break;
    }
  }, [startMutation, stopMutation, deleteMutation]);

  // 批量启动所有停止的设备
  const handleStartAll = useCallback(() => {
    const stoppedDevices = devicesData?.data?.filter((d) => d.status === 'stopped') || [];
    if (stoppedDevices.length === 0) {
      message.info('没有可启动的设备');
      return;
    }

    Modal.confirm({
      title: '批量启动',
      content: `确定要启动 ${stoppedDevices.length} 个设备吗？`,
      onOk: () => {
        stoppedDevices.forEach((device) => {
          startMutation.mutate(device.id);
        });
      },
    });
  }, [devicesData?.data, startMutation]);

  // 批量停止所有运行中的设备
  const handleStopAll = useCallback(() => {
    if (runningDevices.length === 0) {
      message.info('没有运行中的设备');
      return;
    }

    Modal.confirm({
      title: '批量停止',
      content: `确定要停止 ${runningDevices.length} 个设备吗？`,
      okType: 'danger',
      onOk: () => {
        runningDevices.forEach((device) => {
          stopMutation.mutate(device.id);
        });
      },
    });
  }, [runningDevices, stopMutation]);

  // 处理连接状态变化
  const handleConnectionChange = useCallback((status: string) => {
    if (status === 'connected') {
      setConnectedCount((prev) => prev + 1);
    } else if (status === 'disconnected' || status === 'error') {
      setConnectedCount((prev) => Math.max(0, prev - 1));
    }
  }, []);

  const layoutConfig = LAYOUT_CONFIGS[layoutSize];

  return (
    <div style={{ padding: 0 }}>
      {/* 头部统计和操作 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[24, 16]} align="middle">
          {/* 统计信息 */}
          <Col xs={24} sm={12} md={8} lg={6}>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="总设备"
                  value={stats?.total || 0}
                  prefix={<DesktopOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="运行中"
                  value={stats?.running || 0}
                  valueStyle={{ color: '#52c41a' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="已连接"
                  value={connectedCount}
                  valueStyle={{ color: '#1677ff' }}
                  prefix={<WifiOutlined />}
                />
              </Col>
            </Row>
          </Col>

          {/* 筛选控件 */}
          <Col xs={24} sm={12} md={8} lg={10}>
            <Space wrap>
              <Input
                placeholder="搜索设备名称"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 160 }}
                allowClear
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 100 }}
              >
                <Option value="all">全部</Option>
                <Option value="running">运行中</Option>
                <Option value="stopped">已停止</Option>
                <Option value="error">异常</Option>
              </Select>
              <Segmented
                value={layoutSize}
                onChange={(v) => setLayoutSize(v as LayoutSize)}
                options={[
                  { value: 'small', icon: <AppstoreOutlined /> },
                  { value: 'medium', icon: <BarsOutlined /> },
                  { value: 'large', icon: <FullscreenOutlined /> },
                ]}
              />
            </Space>
          </Col>

          {/* 操作按钮 */}
          <Col xs={24} sm={24} md={8} lg={8} style={{ textAlign: 'right' }}>
            <Space wrap>
              <Tooltip title="刷新列表">
                <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
              </Tooltip>
              <Button
                icon={autoConnect ? <LinkOutlined /> : <DisconnectOutlined />}
                type={autoConnect ? 'primary' : 'default'}
                onClick={() => setAutoConnect(!autoConnect)}
              >
                {autoConnect ? '自动连接' : '手动连接'}
              </Button>
              <Button
                icon={<PlayCircleOutlined />}
                onClick={handleStartAll}
                disabled={!devicesData?.data?.some((d) => d.status === 'stopped')}
              >
                全部启动
              </Button>
              <Button
                danger
                icon={<PauseCircleOutlined />}
                onClick={handleStopAll}
                disabled={runningDevices.length === 0}
              >
                全部停止
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 设备网格 */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 100 }}>
          <Spin size="large" tip="加载设备列表..." />
        </div>
      ) : filteredDevices.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <span>
                {statusFilter === 'running'
                  ? '没有运行中的设备'
                  : searchText
                    ? '没有匹配的设备'
                    : '暂无设备'}
              </span>
            }
          >
            {statusFilter === 'running' && (
              <Button type="primary" onClick={() => setStatusFilter('all')}>
                查看所有设备
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <Row gutter={[12, 12]}>
          {filteredDevices.map((device) => (
            <Col key={device.id} {...layoutConfig.cols}>
              <DevicePlayerCard
                device={device}
                autoConnect={autoConnect && device.status === 'running'}
                onStatusChange={handleConnectionChange}
                onAction={handleDeviceAction}
              />
            </Col>
          ))}
        </Row>
      )}

      {/* 底部状态栏 */}
      <Card
        style={{
          marginTop: 16,
          position: 'sticky',
          bottom: 0,
          zIndex: 10,
        }}
        size="small"
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
              <Text type="secondary">
                显示 {filteredDevices.length} / {devicesData?.data?.length || 0} 台设备
              </Text>
              <Badge status="processing" text={<Text type="secondary">实时刷新中</Text>} />
            </Space>
          </Col>
          <Col>
            <Space>
              <Tag color="success">运行: {stats?.running || 0}</Tag>
              <Tag color="default">停止: {stats?.stopped || 0}</Tag>
              <Tag color="error">异常: {stats?.error || 0}</Tag>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 代理配置弹窗 */}
      <Modal
        title={`配置代理 - ${selectedDevice?.name || ''}`}
        open={proxyModalVisible}
        onCancel={() => {
          setProxyModalVisible(false);
          setSelectedDevice(null);
        }}
        footer={null}
        destroyOnClose
      >
        <div style={{ padding: '16px 0' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            选择要分配给此设备的代理：
          </Text>
          <Select
            style={{ width: '100%' }}
            placeholder="选择代理"
            onChange={(proxyId) => {
              if (selectedDevice && proxyId) {
                setProxyMutation.mutate({ deviceId: selectedDevice.id, proxyId });
              }
            }}
            loading={setProxyMutation.isPending}
          >
            {proxiesData?.data
              ?.filter((p) => p.status === 'available')
              .map((proxy) => (
                <Option key={proxy.id} value={proxy.id}>
                  <Space>
                    <Tag color="blue">{proxy.protocol.toUpperCase()}</Tag>
                    <span>{proxy.host}:{proxy.port}</span>
                    <Tag>{proxy.country}</Tag>
                    <Tag color={proxy.quality >= 90 ? 'success' : proxy.quality >= 70 ? 'warning' : 'error'}>
                      {proxy.quality}分
                    </Tag>
                  </Space>
                </Option>
              ))}
          </Select>
        </div>
      </Modal>
    </div>
  );
};

export default DeviceControl;
