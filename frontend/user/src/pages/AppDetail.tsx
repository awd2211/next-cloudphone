import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Button,
  Descriptions,
  Tag,
  Modal,
  Form,
  Select,
  message,
  Spin,
  Alert,
  Image,
  Divider,
  Typography,
  Space,
  Avatar,
  Tabs,
} from 'antd';
import {
  DownloadOutlined,
  ArrowLeftOutlined,
  AppstoreOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { getApp, installAppToDevice } from '@/services/app';
import { getMyDevices } from '@/services/device';
import type { Application, Device } from '@/types';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

const AppDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<Application | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [installModalVisible, setInstallModalVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadAppDetail();
    loadDevices();
  }, [id]);

  const loadAppDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await getApp(id);
      setApp(res);
    } catch (error) {
      message.error('加载应用详情失败');
    } finally {
      setLoading(false);
    }
  };

  const loadDevices = async () => {
    try {
      const res = await getMyDevices({ page: 1, pageSize: 100 });
      setDevices(res.data.filter((d) => d.status === 'running' || d.status === 'idle'));
    } catch (error) {
      console.error('加载设备列表失败', error);
    }
  };

  const handleInstall = () => {
    if (devices.length === 0) {
      message.warning('没有可用的设备，请先创建并启动设备');
      return;
    }
    setInstallModalVisible(true);
  };

  const handleInstallConfirm = async (values: { deviceId: string }) => {
    if (!app) return;
    setInstalling(true);
    try {
      await installAppToDevice(values.deviceId, app.id);
      message.success('应用安装任务已创建');
      setInstallModalVisible(false);
      form.resetFields();
    } catch (error: any) {
      message.error(error.message || '应用安装失败');
    } finally {
      setInstalling(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getCategoryLabel = (category: string) => {
    const categoryMap: Record<string, string> = {
      social: '社交',
      entertainment: '娱乐',
      tools: '工具',
      games: '游戏',
      productivity: '办公',
      others: '其他',
    };
    return categoryMap[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colorMap: Record<string, string> = {
      social: 'blue',
      entertainment: 'purple',
      tools: 'green',
      games: 'red',
      productivity: 'orange',
      others: 'default',
    };
    return colorMap[category] || 'default';
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!app) {
    return (
      <Alert message="应用不存在" description="未找到该应用，可能已被删除" type="error" showIcon />
    );
  }

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/apps')}
        style={{ marginBottom: 16 }}
      >
        返回应用市场
      </Button>

      <Card>
        <Row gutter={24}>
          {/* 左侧：应用图标和基本信息 */}
          <Col xs={24} md={8}>
            <div style={{ textAlign: 'center' }}>
              {app.icon ? (
                <Image
                  src={app.icon}
                  alt={app.name}
                  width={150}
                  height={150}
                  style={{ borderRadius: 12 }}
                  fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150'%3E%3Crect width='150' height='150' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' font-size='20' text-anchor='middle' dy='.3em' fill='%23999'%3E%E6%97%A0%E5%9B%BE%E6%A0%87%3C/text%3E%3C/svg%3E"
                />
              ) : (
                <Avatar
                  size={150}
                  icon={<AppstoreOutlined />}
                  style={{ backgroundColor: '#1890ff' }}
                />
              )}
              <div style={{ marginTop: 24 }}>
                <Button
                  type="primary"
                  size="large"
                  icon={<DownloadOutlined />}
                  onClick={handleInstall}
                  block
                >
                  安装到设备
                </Button>
              </div>
            </div>

            <Divider />

            <Descriptions column={1} size="small">
              <Descriptions.Item label="版本">{app.version}</Descriptions.Item>
              <Descriptions.Item label="大小">{formatSize(app.size)}</Descriptions.Item>
              <Descriptions.Item label="分类">
                <Tag color={getCategoryColor(app.category)}>{getCategoryLabel(app.category)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="包名">
                <Text copyable style={{ fontSize: 12, color: '#666' }}>
                  {app.packageName}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="上传时间">
                {new Date(app.createdAt).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
          </Col>

          {/* 右侧：详细描述 */}
          <Col xs={24} md={16}>
            <Title level={2}>{app.name}</Title>

            <Space size="large" style={{ marginBottom: 24 }}>
              <Space>
                <ClockCircleOutlined />
                <Text type="secondary">{new Date(app.createdAt).toLocaleDateString()}</Text>
              </Space>
              <Space>
                <CheckCircleOutlined style={{ color: '#52c41a' }} />
                <Text type="secondary">已审核</Text>
              </Space>
            </Space>

            <Tabs defaultActiveKey="1">
              <TabPane tab="应用介绍" key="1">
                <Paragraph>{app.description || '暂无应用描述'}</Paragraph>

                <Divider orientation="left">应用信息</Divider>
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="应用名称" span={2}>
                    {app.name}
                  </Descriptions.Item>
                  <Descriptions.Item label="包名" span={2}>
                    <Text code>{app.packageName}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="版本号">{app.version}</Descriptions.Item>
                  <Descriptions.Item label="应用大小">{formatSize(app.size)}</Descriptions.Item>
                  <Descriptions.Item label="分类">
                    <Tag color={getCategoryColor(app.category)}>
                      {getCategoryLabel(app.category)}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="上传时间">
                    {new Date(app.createdAt).toLocaleString()}
                  </Descriptions.Item>
                </Descriptions>
              </TabPane>

              <TabPane tab="安装说明" key="2">
                <Alert
                  message="安装步骤"
                  description={
                    <ol>
                      <li>点击"安装到设备"按钮</li>
                      <li>选择要安装的设备（设备需处于运行状态）</li>
                      <li>确认安装，系统将自动下载并安装应用</li>
                      <li>安装完成后可在设备详情页查看已安装应用</li>
                    </ol>
                  }
                  type="info"
                  showIcon
                />

                <Divider />

                <Alert
                  message="注意事项"
                  description={
                    <ul style={{ marginBottom: 0 }}>
                      <li>安装过程可能需要几分钟，请耐心等待</li>
                      <li>确保设备有足够的存储空间</li>
                      <li>如安装失败，请检查设备状态或联系客服</li>
                      <li>部分应用可能需要特定的Android版本</li>
                    </ul>
                  }
                  type="warning"
                  showIcon
                />
              </TabPane>

              <TabPane tab="更新记录" key="3">
                <Descriptions bordered column={1}>
                  <Descriptions.Item label={`版本 ${app.version}`}>
                    <Space direction="vertical">
                      <Text>发布时间: {new Date(app.createdAt).toLocaleString()}</Text>
                      <Text>大小: {formatSize(app.size)}</Text>
                      <Text type="secondary">当前版本</Text>
                    </Space>
                  </Descriptions.Item>
                </Descriptions>
              </TabPane>
            </Tabs>
          </Col>
        </Row>
      </Card>

      {/* 安装模态框 */}
      <Modal
        title="安装应用到设备"
        open={installModalVisible}
        onCancel={() => setInstallModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={installing}
        okText="安装"
        cancelText="取消"
      >
        <Alert
          message="选择目标设备"
          description={`即将安装 ${app.name} (${app.version})`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form form={form} layout="vertical" onFinish={handleInstallConfirm}>
          <Form.Item
            label="选择设备"
            name="deviceId"
            rules={[{ required: true, message: '请选择要安装的设备' }]}
          >
            <Select placeholder="请选择设备" showSearch optionFilterProp="children">
              {devices.map((device) => (
                <Select.Option key={device.id} value={device.id}>
                  {device.name} ({device.status === 'running' ? '运行中' : '空闲'})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {devices.length === 0 && (
            <Alert
              message="没有可用设备"
              description="请先创建并启动设备"
              type="warning"
              showIcon
            />
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default AppDetail;
