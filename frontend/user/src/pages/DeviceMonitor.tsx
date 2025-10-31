import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Alert,
  Button,
  Space,
  Spin,
  Empty,
  Typography,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  DashboardOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  ThunderboltOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Line } from '@ant-design/charts';
import { getDeviceStats, getDevice } from '@/services/device';
import type { Device } from '@/types';

const { Title, Text } = Typography;

interface DeviceStats {
  cpuUsage: number;
  memoryUsed: number;
  memoryTotal: number;
  storageUsed: number;
  storageTotal: number;
  networkIn: number;
  networkOut: number;
  uptime: number;
}

interface HistoryData {
  time: string;
  cpuUsage: number;
  memoryUsage: number;
}

const DeviceMonitor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [device, setDevice] = useState<Device | null>(null);
  const [stats, setStats] = useState<DeviceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [historyData, setHistoryData] = useState<HistoryData[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDevice();
    loadStats();

    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        loadStats();
      }, 5000); // 每5秒刷新一次
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [id, autoRefresh]);

  const loadDevice = async () => {
    if (!id) return;
    try {
      const res = await getDevice(id);
      setDevice(res.data);
    } catch (error) {
      console.error('加载设备信息失败', error);
    }
  };

  const loadStats = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getDeviceStats(id);
      const newStats = res.data;
      setStats(newStats);

      // 添加到历史数据（最多保留20条）
      setHistoryData((prev) => {
        const now = new Date().toLocaleTimeString();
        const memoryUsagePercent = (newStats.memoryUsed / newStats.memoryTotal) * 100;
        const newData = [
          ...prev,
          {
            time: now,
            cpuUsage: newStats.cpuUsage,
            memoryUsage: memoryUsagePercent,
          },
        ];
        return newData.slice(-20);
      });
    } catch (error) {
      console.error('加载设备统计信息失败', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh((prev) => !prev);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}天 ${hours}小时`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  const getProgressStatus = (percent: number): 'success' | 'normal' | 'exception' => {
    if (percent >= 90) return 'exception';
    if (percent >= 70) return 'normal';
    return 'success';
  };

  // 图表配置
  const cpuChartConfig = {
    data: historyData,
    xField: 'time',
    yField: 'cpuUsage',
    height: 200,
    smooth: true,
    color: '#1890ff',
    yAxis: {
      min: 0,
      max: 100,
      label: {
        formatter: (v: string) => `${v}%`,
      },
    },
    xAxis: {
      label: {
        autoRotate: true,
        autoHide: true,
      },
    },
    point: {
      size: 3,
    },
    tooltip: {
      formatter: (datum: HistoryData) => ({
        name: 'CPU使用率',
        value: `${datum.cpuUsage.toFixed(1)}%`,
      }),
    },
  };

  const memoryChartConfig = {
    data: historyData,
    xField: 'time',
    yField: 'memoryUsage',
    height: 200,
    smooth: true,
    color: '#52c41a',
    yAxis: {
      min: 0,
      max: 100,
      label: {
        formatter: (v: string) => `${v}%`,
      },
    },
    xAxis: {
      label: {
        autoRotate: true,
        autoHide: true,
      },
    },
    point: {
      size: 3,
    },
    tooltip: {
      formatter: (datum: HistoryData) => ({
        name: '内存使用率',
        value: `${datum.memoryUsage.toFixed(1)}%`,
      }),
    },
  };

  if (loading && !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!device || !stats) {
    return (
      <div>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/devices')}
          style={{ marginBottom: 16 }}
        >
          返回设备列表
        </Button>
        <Empty description="设备不存在或暂无监控数据" />
      </div>
    );
  }

  const memoryPercent = (stats.memoryUsed / stats.memoryTotal) * 100;
  const storagePercent = (stats.storageUsed / stats.storageTotal) * 100;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/devices/${id}`)}>
          返回设备详情
        </Button>
        <Button icon={<ReloadOutlined />} onClick={loadStats} loading={loading}>
          手动刷新
        </Button>
        <Button type={autoRefresh ? 'primary' : 'default'} onClick={toggleAutoRefresh}>
          {autoRefresh ? '停止自动刷新' : '开启自动刷新'}
        </Button>
      </Space>

      <Title level={2}>
        <DashboardOutlined /> 设备监控: {device.name}
      </Title>

      {autoRefresh && (
        <Alert
          message="实时监控中"
          description="数据每5秒自动刷新一次"
          type="info"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 基本统计 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="CPU使用率"
              value={stats.cpuUsage}
              precision={1}
              suffix="%"
              prefix={<ThunderboltOutlined />}
              valueStyle={{
                color:
                  stats.cpuUsage > 80 ? '#cf1322' : stats.cpuUsage > 50 ? '#faad14' : '#3f8600',
              }}
            />
            <Progress
              percent={stats.cpuUsage}
              status={getProgressStatus(stats.cpuUsage)}
              showInfo={false}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="内存使用"
              value={memoryPercent}
              precision={1}
              suffix="%"
              prefix={<DatabaseOutlined />}
              valueStyle={{
                color: memoryPercent > 80 ? '#cf1322' : memoryPercent > 50 ? '#faad14' : '#3f8600',
              }}
            />
            <Progress
              percent={memoryPercent}
              status={getProgressStatus(memoryPercent)}
              showInfo={false}
              style={{ marginTop: 8 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatBytes(stats.memoryUsed)} / {formatBytes(stats.memoryTotal)}
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="存储使用"
              value={storagePercent}
              precision={1}
              suffix="%"
              prefix={<DatabaseOutlined />}
              valueStyle={{
                color:
                  storagePercent > 80 ? '#cf1322' : storagePercent > 50 ? '#faad14' : '#3f8600',
              }}
            />
            <Progress
              percent={storagePercent}
              status={getProgressStatus(storagePercent)}
              showInfo={false}
              style={{ marginTop: 8 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatBytes(stats.storageUsed)} / {formatBytes(stats.storageTotal)}
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="运行时长"
              value={formatUptime(stats.uptime)}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* 实时图表 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="CPU使用率趋势" bordered={false}>
            {historyData.length > 0 ? (
              <Line {...cpuChartConfig} />
            ) : (
              <Empty description="暂无历史数据" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="内存使用率趋势" bordered={false}>
            {historyData.length > 0 ? (
              <Line {...memoryChartConfig} />
            ) : (
              <Empty description="暂无历史数据" style={{ padding: '40px 0' }} />
            )}
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* 网络统计 */}
      <Card title="网络流量" bordered={false}>
        <Row gutter={16}>
          <Col xs={12} md={6}>
            <Statistic
              title="入站流量"
              value={formatBytes(stats.networkIn)}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col xs={12} md={6}>
            <Statistic
              title="出站流量"
              value={formatBytes(stats.networkOut)}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default DeviceMonitor;
