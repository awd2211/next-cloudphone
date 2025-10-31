import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Alert,
  Statistic,
  Row,
  Col,
  Descriptions,
  Modal,
  Typography,
  message,
} from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  ApiOutlined,
  ClusterOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface ServiceInstance {
  id: string;
  name: string;
  address: string;
  port: number;
  status: 'passing' | 'warning' | 'critical';
  tags: string[];
  meta?: Record<string, string>;
}

interface ServiceHealth {
  service: string;
  instances: ServiceInstance[];
  healthyCount: number;
  unhealthyCount: number;
}

const ConsulMonitor = () => {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceHealth | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadServices();

    if (autoRefresh) {
      const interval = setInterval(loadServices, 10000); // 每10秒刷新
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadServices = async () => {
    setLoading(true);
    try {
      // 模拟数据 - 实际应该调用Consul API
      const mockData: ServiceHealth[] = [
        {
          service: 'api-gateway',
          instances: [
            {
              id: 'api-gateway-1',
              name: 'api-gateway',
              address: '172.18.0.5',
              port: 30000,
              status: 'passing',
              tags: ['v1.0.0', 'cluster'],
              meta: { version: '1.0.0', instances: '4' },
            },
          ],
          healthyCount: 1,
          unhealthyCount: 0,
        },
        {
          service: 'user-service',
          instances: [
            {
              id: 'user-service-1',
              name: 'user-service',
              address: '172.18.0.6',
              port: 30001,
              status: 'passing',
              tags: ['v1.0.0', 'cluster'],
              meta: { version: '1.0.0', instances: '2' },
            },
          ],
          healthyCount: 1,
          unhealthyCount: 0,
        },
        {
          service: 'device-service',
          instances: [
            {
              id: 'device-service-1',
              name: 'device-service',
              address: '172.18.0.7',
              port: 30002,
              status: 'passing',
              tags: ['v1.0.0'],
              meta: { version: '1.0.0' },
            },
          ],
          healthyCount: 1,
          unhealthyCount: 0,
        },
        {
          service: 'app-service',
          instances: [
            {
              id: 'app-service-1',
              name: 'app-service',
              address: '172.18.0.8',
              port: 30003,
              status: 'passing',
              tags: ['v1.0.0'],
              meta: { version: '1.0.0' },
            },
          ],
          healthyCount: 1,
          unhealthyCount: 0,
        },
        {
          service: 'billing-service',
          instances: [
            {
              id: 'billing-service-1',
              name: 'billing-service',
              address: '172.18.0.9',
              port: 30005,
              status: 'passing',
              tags: ['v1.0.0'],
              meta: { version: '1.0.0' },
            },
          ],
          healthyCount: 1,
          unhealthyCount: 0,
        },
        {
          service: 'notification-service',
          instances: [
            {
              id: 'notification-service-1',
              name: 'notification-service',
              address: '172.18.0.10',
              port: 30006,
              status: 'warning',
              tags: ['v1.0.0'],
              meta: { version: '1.0.0' },
            },
          ],
          healthyCount: 0,
          unhealthyCount: 1,
        },
      ];
      setServices(mockData);
    } catch (error) {
      message.error('加载服务信息失败');
    } finally {
      setLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      passing: {
        color: 'success',
        icon: <CheckCircleOutlined />,
        text: '健康',
      },
      warning: {
        color: 'warning',
        icon: <WarningOutlined />,
        text: '警告',
      },
      critical: {
        color: 'error',
        icon: <CloseCircleOutlined />,
        text: '异常',
      },
    };
    const config = statusConfig[status] || statusConfig.critical;
    return (
      <Tag icon={config.icon} color={config.color}>
        {config.text}
      </Tag>
    );
  };

  const columns: ColumnsType<ServiceHealth> = [
    {
      title: '服务名称',
      dataIndex: 'service',
      key: 'service',
      width: 200,
      render: (service: string) => (
        <Space>
          <ApiOutlined />
          <Text strong>{service}</Text>
        </Space>
      ),
    },
    {
      title: '实例数',
      key: 'instances',
      width: 120,
      align: 'center',
      render: (_, record) => <Text>{record.instances.length}</Text>,
    },
    {
      title: '健康实例',
      dataIndex: 'healthyCount',
      key: 'healthyCount',
      width: 120,
      align: 'center',
      render: (count: number) => <Text style={{ color: '#52c41a' }}>{count}</Text>,
    },
    {
      title: '异常实例',
      dataIndex: 'unhealthyCount',
      key: 'unhealthyCount',
      width: 120,
      align: 'center',
      render: (count: number) => (
        <Text style={{ color: count > 0 ? '#ff4d4f' : '#999' }}>{count}</Text>
      ),
    },
    {
      title: '整体状态',
      key: 'status',
      width: 120,
      render: (_, record) => {
        const hasUnhealthy = record.unhealthyCount > 0;
        const allUnhealthy = record.healthyCount === 0;
        return getStatusTag(allUnhealthy ? 'critical' : hasUnhealthy ? 'warning' : 'passing');
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => {
            setSelectedService(record);
            setDetailModalVisible(true);
          }}
        >
          查看详情
        </Button>
      ),
    },
  ];

  const totalServices = services.length;
  const healthyServices = services.filter((s) => s.unhealthyCount === 0).length;
  const unhealthyServices = services.filter((s) => s.healthyCount === 0).length;
  const warningServices = services.filter((s) => s.healthyCount > 0 && s.unhealthyCount > 0).length;

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>
        <ClusterOutlined /> Consul 服务监控
      </Title>

      <Alert
        message="实时监控"
        description={`服务发现与健康检查监控 - ${autoRefresh ? '自动刷新中（每10秒）' : '已暂停自动刷新'}`}
        type="info"
        showIcon
        closable
        style={{ marginBottom: 24 }}
      />

      {/* 统计信息 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic title="服务总数" value={totalServices} prefix={<ApiOutlined />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="健康服务"
              value={healthyServices}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="警告服务"
              value={warningServices}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="异常服务"
              value={unhealthyServices}
              valueStyle={{ color: '#cf1322' }}
              prefix={<CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* 服务列表 */}
      <Card
        title="服务列表"
        extra={
          <Space>
            <Button
              type={autoRefresh ? 'primary' : 'default'}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? '停止自动刷新' : '开启自动刷新'}
            </Button>
            <Button icon={<ReloadOutlined />} onClick={loadServices} loading={loading}>
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={services}
          rowKey="service"
          loading={loading}
          pagination={false}
        />
      </Card>

      {/* 服务详情模态框 */}
      <Modal
        title={`服务详情: ${selectedService?.service}`}
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedService(null);
        }}
        footer={[
          <Button
            key="close"
            onClick={() => {
              setDetailModalVisible(false);
              setSelectedService(null);
            }}
          >
            关闭
          </Button>,
        ]}
        width={800}
      >
        {selectedService && (
          <div>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="服务名称" span={2}>
                {selectedService.service}
              </Descriptions.Item>
              <Descriptions.Item label="实例总数">
                {selectedService.instances.length}
              </Descriptions.Item>
              <Descriptions.Item label="健康实例">
                <Text style={{ color: '#52c41a' }}>{selectedService.healthyCount}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="异常实例">
                <Text style={{ color: selectedService.unhealthyCount > 0 ? '#ff4d4f' : '#999' }}>
                  {selectedService.unhealthyCount}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="整体状态">
                {getStatusTag(
                  selectedService.healthyCount === 0
                    ? 'critical'
                    : selectedService.unhealthyCount > 0
                      ? 'warning'
                      : 'passing'
                )}
              </Descriptions.Item>
            </Descriptions>

            <Title level={5}>实例列表</Title>
            <Table
              columns={[
                {
                  title: '实例ID',
                  dataIndex: 'id',
                  key: 'id',
                  width: 200,
                },
                {
                  title: '地址',
                  key: 'address',
                  render: (_, record) => `${record.address}:${record.port}`,
                },
                {
                  title: '状态',
                  dataIndex: 'status',
                  key: 'status',
                  width: 100,
                  render: (status: string) => getStatusTag(status),
                },
                {
                  title: '标签',
                  dataIndex: 'tags',
                  key: 'tags',
                  render: (tags: string[]) => (
                    <Space wrap>
                      {tags.map((tag, index) => (
                        <Tag key={index}>{tag}</Tag>
                      ))}
                    </Space>
                  ),
                },
              ]}
              dataSource={selectedService.instances}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </div>
        )}
      </Modal>

      {/* 使用说明 */}
      <Card title="监控说明" style={{ marginTop: 24 }} bordered={false}>
        <ul>
          <li>本页面显示所有在Consul注册的微服务状态</li>
          <li>健康检查每10秒自动刷新（可手动关闭）</li>
          <li>绿色表示服务健康，黄色表示部分实例异常，红色表示服务不可用</li>
          <li>点击"查看详情"可以看到每个服务实例的详细信息</li>
          <li>Consul地址: http://localhost:8500</li>
        </ul>
      </Card>
    </div>
  );
};

export default ConsulMonitor;
