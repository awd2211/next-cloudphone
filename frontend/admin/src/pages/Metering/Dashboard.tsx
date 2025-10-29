import { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  DatePicker,
  Select,
  Space,
  message,
  Tabs,
  Progress,
  Tag,
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  MobileOutlined,
  ClockCircleOutlined,
  CloudServerOutlined,
  LineChartOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getMeteringOverview,
  getUserMeterings,
  getDeviceMeterings,
  getMeteringTrend,
  getResourceUsageAnalysis,
} from '@/services/billing';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TabPane } = Tabs;

interface MeteringOverview {
  totalUsers: number;
  activeUsers: number;
  totalDevices: number;
  totalHours: number;
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
}

interface UserMetering {
  userId: string;
  username: string;
  deviceCount: number;
  totalHours: number;
  cpuHours: number;
  memoryMB: number;
  storageMB: number;
  cost: number;
}

interface DeviceMetering {
  deviceId: string;
  deviceName: string;
  userId: string;
  hours: number;
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  cost: number;
}

const MeteringDashboard = () => {
  const [overview, setOverview] = useState<MeteringOverview | null>(null);
  const [userMeterings, setUserMeterings] = useState<UserMetering[]>([]);
  const [deviceMeterings, setDeviceMeterings] = useState<DeviceMetering[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[string, string]>([
    dayjs().subtract(30, 'days').format('YYYY-MM-DD'),
    dayjs().format('YYYY-MM-DD'),
  ]);
  const [trendType, setTrendType] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // 加载概览数据
  const loadOverview = async () => {
    try {
      const data = await getMeteringOverview();
      setOverview(data as MeteringOverview);
    } catch (error) {
      message.error('加载概览数据失败');
    }
  };

  // 加载用户计量
  const loadUserMeterings = async () => {
    setLoading(true);
    try {
      const res = await getUserMeterings({
        startDate: dateRange[0],
        endDate: dateRange[1],
      });
      setUserMeterings(res.data as UserMetering[]);
    } catch (error) {
      message.error('加载用户计量失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载设备计量
  const loadDeviceMeterings = async () => {
    setLoading(true);
    try {
      const res = await getDeviceMeterings({
        startDate: dateRange[0],
        endDate: dateRange[1],
      });
      setDeviceMeterings(res.data as DeviceMetering[]);
    } catch (error) {
      message.error('加载设备计量失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
    loadUserMeterings();
    loadDeviceMeterings();
  }, [dateRange]);

  const userColumns: ColumnsType<UserMetering> = [
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      width: 150,
    },
    {
      title: '设备数',
      dataIndex: 'deviceCount',
      key: 'deviceCount',
      width: 100,
      align: 'center',
      render: (count) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: '总时长 (h)',
      dataIndex: 'totalHours',
      key: 'totalHours',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.totalHours - b.totalHours,
      render: (hours) => hours.toFixed(2),
    },
    {
      title: 'CPU 时长 (h)',
      dataIndex: 'cpuHours',
      key: 'cpuHours',
      width: 120,
      align: 'right',
      render: (hours) => hours.toFixed(2),
    },
    {
      title: '内存 (GB)',
      dataIndex: 'memoryMB',
      key: 'memoryMB',
      width: 120,
      align: 'right',
      render: (mb) => (mb / 1024).toFixed(2),
    },
    {
      title: '存储 (GB)',
      dataIndex: 'storageMB',
      key: 'storageMB',
      width: 120,
      align: 'right',
      render: (mb) => (mb / 1024).toFixed(2),
    },
    {
      title: '费用 (¥)',
      dataIndex: 'cost',
      key: 'cost',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.cost - b.cost,
      render: (cost) => (
        <span style={{ color: '#1890ff', fontWeight: 500 }}>
          ¥{cost.toFixed(2)}
        </span>
      ),
    },
  ];

  const deviceColumns: ColumnsType<DeviceMetering> = [
    {
      title: '设备名称',
      dataIndex: 'deviceName',
      key: 'deviceName',
      width: 150,
    },
    {
      title: '用户 ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 150,
      render: (id) => <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{id}</span>,
    },
    {
      title: '运行时长 (h)',
      dataIndex: 'hours',
      key: 'hours',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.hours - b.hours,
      render: (hours) => hours.toFixed(2),
    },
    {
      title: 'CPU 使用率',
      dataIndex: 'cpuUsage',
      key: 'cpuUsage',
      width: 150,
      render: (usage) => (
        <Progress
          percent={Math.round(usage)}
          size="small"
          status={usage > 80 ? 'exception' : usage > 60 ? 'normal' : 'success'}
        />
      ),
    },
    {
      title: '内存使用率',
      dataIndex: 'memoryUsage',
      key: 'memoryUsage',
      width: 150,
      render: (usage) => (
        <Progress
          percent={Math.round(usage)}
          size="small"
          status={usage > 80 ? 'exception' : usage > 60 ? 'normal' : 'success'}
        />
      ),
    },
    {
      title: '费用 (¥)',
      dataIndex: 'cost',
      key: 'cost',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.cost - b.cost,
      render: (cost) => <span style={{ fontWeight: 500 }}>¥{cost.toFixed(2)}</span>,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="总用户数"
                value={overview?.totalUsers || 0}
                prefix={<UserOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="活跃用户"
                value={overview?.activeUsers || 0}
                valueStyle={{ color: '#52c41a' }}
                prefix={<UserOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="总设备数"
                value={overview?.totalDevices || 0}
                prefix={<MobileOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="总运行时长 (h)"
                value={overview?.totalHours || 0}
                prefix={<ClockCircleOutlined />}
                precision={2}
              />
            </Col>
          </Row>
        </Card>

        <Card title="资源使用率">
          <Row gutter={16}>
            <Col span={8}>
              <div style={{ marginBottom: '8px' }}>CPU 使用率</div>
              <Progress
                percent={Math.round(overview?.cpuUsage || 0)}
                status={
                  (overview?.cpuUsage || 0) > 80
                    ? 'exception'
                    : (overview?.cpuUsage || 0) > 60
                    ? 'normal'
                    : 'success'
                }
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: '8px' }}>内存使用率</div>
              <Progress
                percent={Math.round(overview?.memoryUsage || 0)}
                status={
                  (overview?.memoryUsage || 0) > 80
                    ? 'exception'
                    : (overview?.memoryUsage || 0) > 60
                    ? 'normal'
                    : 'success'
                }
              />
            </Col>
            <Col span={8}>
              <div style={{ marginBottom: '8px' }}>存储使用率</div>
              <Progress
                percent={Math.round(overview?.storageUsage || 0)}
                status={
                  (overview?.storageUsage || 0) > 80
                    ? 'exception'
                    : (overview?.storageUsage || 0) > 60
                    ? 'normal'
                    : 'success'
                }
              />
            </Col>
          </Row>
        </Card>

        <Card
          title={<span><LineChartOutlined /> 计量详情</span>}
          extra={
            <Space>
              <RangePicker
                value={[dayjs(dateRange[0]), dayjs(dateRange[1])]}
                onChange={(dates) => {
                  if (dates) {
                    setDateRange([
                      dates[0]!.format('YYYY-MM-DD'),
                      dates[1]!.format('YYYY-MM-DD'),
                    ]);
                  }
                }}
              />
            </Space>
          }
        >
          <Tabs defaultActiveKey="users">
            <TabPane tab="用户计量" key="users">
              <Table
                columns={userColumns}
                dataSource={userMeterings}
                rowKey="userId"
                loading={loading}
                pagination={{ pageSize: 10 }}
                summary={(data) => {
                  const totalHours = data.reduce((sum, item) => sum + item.totalHours, 0);
                  const totalCost = data.reduce((sum, item) => sum + item.cost, 0);
                  return (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0}>
                          <strong>合计</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={1}>-</Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right">
                          <strong>{totalHours.toFixed(2)}</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3}>-</Table.Summary.Cell>
                        <Table.Summary.Cell index={4}>-</Table.Summary.Cell>
                        <Table.Summary.Cell index={5}>-</Table.Summary.Cell>
                        <Table.Summary.Cell index={6} align="right">
                          <strong style={{ color: '#1890ff' }}>¥{totalCost.toFixed(2)}</strong>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
              />
            </TabPane>

            <TabPane tab="设备计量" key="devices">
              <Table
                columns={deviceColumns}
                dataSource={deviceMeterings}
                rowKey="deviceId"
                loading={loading}
                pagination={{ pageSize: 10 }}
              />
            </TabPane>
          </Tabs>
        </Card>
      </Space>
    </div>
  );
};

export default MeteringDashboard;
