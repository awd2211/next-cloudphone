import { useState, lazy, Suspense } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Divider,
  Alert,
  Tag,
  Row,
  Col,
  Descriptions,
  message,
  Spin,
  Tabs,
  Select,
} from 'antd';
import {
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  CopyOutlined,
  ThunderboltOutlined,
  GlobalOutlined,
  CloudServerOutlined,
  MobileOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import { api } from '@/utils/api';

const { Title, Text, Paragraph } = Typography;

// 懒加载阿里云测试播放器组件（使用测试 API，无需数据库设备）
const AliyunCloudPhonePlayer = lazy(() => import('@/components/AliyunCloudPhonePlayer'));

interface ConnectionInfo {
  networkId: string;
  type: string;
  vpcId: string;
  privateIp: string;
  publicIp: string;
  privatePort: number;
  publicPort: number;
  instanceId: string;
  regionId: string;
}

interface TestResult {
  success: boolean;
  message: string;
  latency?: number;
  deviceInfo?: {
    model?: string;
    androidVersion?: string;
    serialNumber?: string;
  };
}

const AdbConnectionTest: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [showScreen, setShowScreen] = useState(false);
  const [activeTab, setActiveTab] = useState('connection');

  // 预设的连接信息（从阿里云控制台获取）
  const presetInfo: ConnectionInfo = {
    networkId: 'cn-hongkong+dir-116412ya23i4o6uss',
    type: 'VPC网络（已开通互联网）',
    vpcId: 'vpc-j6cwryoghuzznd254op2h',
    privateIp: '10.0.0.57',
    publicIp: '8.218.72.201',
    privatePort: 5555,
    publicPort: 100,
    // 从 networkId 解析实例 ID 和地域
    instanceId: 'dir-116412ya23i4o6uss', // 这个需要从阿里云云手机控制台获取真实的实例 ID
    regionId: 'cn-hongkong',
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  };

  // 填充预设值
  const fillPreset = () => {
    form.setFieldsValue({
      host: presetInfo.publicIp,
      port: presetInfo.publicPort,
      instanceId: presetInfo.instanceId,
      regionId: presetInfo.regionId,
    });
  };

  // 测试 ADB 连接
  const handleTest = async (values: { host: string; port: number }) => {
    setLoading(true);
    setTestResult(null);

    try {
      const startTime = Date.now();

      // 调用后端 API 测试 ADB 连接
      const response = await api.post<{
        success: boolean;
        message: string;
        deviceInfo?: any;
      }>('/devices/test-adb-connection', {
        host: values.host,
        port: values.port,
      });

      const latency = Date.now() - startTime;

      setTestResult({
        success: response.success,
        message: response.message || '连接成功',
        latency,
        deviceInfo: response.deviceInfo,
      });

      if (response.success) {
        message.success('ADB 连接测试成功！');
      } else {
        message.error(response.message || '连接失败');
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || '连接测试失败，请检查网络和端口设置',
      });
      message.error('连接测试失败');
    } finally {
      setLoading(false);
    }
  };

  const adbCommand = `adb connect ${presetInfo.publicIp}:${presetInfo.publicPort}`;

  // Tab 配置
  const tabItems = [
    {
      key: 'connection',
      label: (
        <Space>
          <ApiOutlined />
          连接测试
        </Space>
      ),
      children: (
        <Row gutter={[24, 24]}>
          {/* 左侧：设备信息 */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <CloudServerOutlined />
                  设备网络信息
                </Space>
              }
              extra={
                <Button type="link" onClick={fillPreset}>
                  填充到表单
                </Button>
              }
            >
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="网络 ID">
                  <Text copyable={{ text: presetInfo.networkId }}>
                    {presetInfo.networkId}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="类型">
                  <Tag color="blue">{presetInfo.type}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="VPC ID">
                  <Text copyable={{ text: presetInfo.vpcId }}>
                    {presetInfo.vpcId}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="私网 IP">
                  <Text code>{presetInfo.privateIp}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="公网 IP">
                  <Text code copyable>
                    {presetInfo.publicIp}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="实例 ID">
                  <Text code copyable>
                    {presetInfo.instanceId}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="地域">
                  <Tag color="green">{presetInfo.regionId}</Tag>
                </Descriptions.Item>
              </Descriptions>

              <Divider />

              <Title level={5}>
                <GlobalOutlined /> ADB 连接方式
              </Title>

              <table style={{ width: '100%', marginBottom: 16 }}>
                <thead>
                  <tr style={{ background: '#fafafa' }}>
                    <th style={{ padding: 8, textAlign: 'left' }}>私网 IP</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>私网端口</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>公网 IP</th>
                    <th style={{ padding: 8, textAlign: 'left' }}>公网端口</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: 8 }}>{presetInfo.privateIp}</td>
                    <td style={{ padding: 8 }}>{presetInfo.privatePort}</td>
                    <td style={{ padding: 8 }}>{presetInfo.publicIp}</td>
                    <td style={{ padding: 8 }}>{presetInfo.publicPort}</td>
                  </tr>
                </tbody>
              </table>

              <Alert
                message="连接命令"
                description={
                  <Space>
                    <Text code style={{ fontSize: 14 }}>{adbCommand}</Text>
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(adbCommand)}
                    >
                      复制
                    </Button>
                  </Space>
                }
                type="info"
                showIcon
              />
            </Card>
          </Col>

          {/* 右侧：测试表单 */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <Space>
                  <ThunderboltOutlined />
                  连接测试
                </Space>
              }
            >
              <Form
                form={form}
                layout="vertical"
                onFinish={handleTest}
                initialValues={{
                  host: presetInfo.publicIp,
                  port: presetInfo.publicPort,
                  instanceId: presetInfo.instanceId,
                  regionId: presetInfo.regionId,
                }}
              >
                <Form.Item
                  name="host"
                  label="主机地址"
                  rules={[
                    { required: true, message: '请输入主机地址' },
                    {
                      pattern: /^(\d{1,3}\.){3}\d{1,3}$|^[a-zA-Z0-9.-]+$/,
                      message: '请输入有效的 IP 地址或域名',
                    },
                  ]}
                >
                  <Input
                    placeholder="例如: 8.218.72.201"
                    prefix={<GlobalOutlined />}
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="port"
                  label="端口"
                  rules={[
                    { required: true, message: '请输入端口号' },
                    {
                      type: 'number',
                      min: 1,
                      max: 65535,
                      message: '端口号范围: 1-65535',
                      transform: (value) => Number(value),
                    },
                  ]}
                >
                  <Input
                    type="number"
                    placeholder="例如: 100"
                    prefix={<ApiOutlined />}
                    size="large"
                  />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    icon={loading ? <LoadingOutlined /> : <ThunderboltOutlined />}
                    size="large"
                    block
                  >
                    {loading ? '测试中...' : '开始测试'}
                  </Button>
                </Form.Item>
              </Form>

              <Divider />

              {/* 测试结果 */}
              {loading && (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <Spin size="large" />
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary">正在测试连接...</Text>
                  </div>
                </div>
              )}

              {testResult && !loading && (
                <Alert
                  message={
                    <Space>
                      {testResult.success ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : (
                        <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      )}
                      {testResult.success ? '连接成功' : '连接失败'}
                    </Space>
                  }
                  description={
                    <div>
                      <Paragraph>{testResult.message}</Paragraph>
                      {testResult.latency && (
                        <Text type="secondary">
                          响应时间: {testResult.latency}ms
                        </Text>
                      )}
                      {testResult.deviceInfo && (
                        <div style={{ marginTop: 8 }}>
                          <Text strong>设备信息:</Text>
                          <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                            {testResult.deviceInfo.model && (
                              <li>型号: {testResult.deviceInfo.model}</li>
                            )}
                            {testResult.deviceInfo.androidVersion && (
                              <li>Android 版本: {testResult.deviceInfo.androidVersion}</li>
                            )}
                            {testResult.deviceInfo.serialNumber && (
                              <li>序列号: {testResult.deviceInfo.serialNumber}</li>
                            )}
                          </ul>
                        </div>
                      )}
                      {testResult.success && (
                        <Button
                          type="primary"
                          icon={<DesktopOutlined />}
                          onClick={() => {
                            setActiveTab('screen');
                            setShowScreen(true);
                          }}
                          style={{ marginTop: 12 }}
                        >
                          查看设备屏幕
                        </Button>
                      )}
                    </div>
                  }
                  type={testResult.success ? 'success' : 'error'}
                  showIcon={false}
                />
              )}
            </Card>

            {/* 使用说明 */}
            <Card title="使用说明" style={{ marginTop: 24 }}>
              <ol style={{ paddingLeft: 20, margin: 0 }}>
                <li style={{ marginBottom: 8 }}>
                  确保云手机设备已启动且网络正常
                </li>
                <li style={{ marginBottom: 8 }}>
                  确保安全组/防火墙已开放对应端口
                </li>
                <li style={{ marginBottom: 8 }}>
                  输入公网 IP 和端口，点击"开始测试"
                </li>
                <li style={{ marginBottom: 8 }}>
                  本地测试可使用命令: <Text code>{adbCommand}</Text>
                </li>
                <li style={{ marginBottom: 8 }}>
                  <Text type="secondary">
                    注意：ADB 连接只能执行命令，查看屏幕需要使用"屏幕投屏"功能
                  </Text>
                </li>
              </ol>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'screen',
      label: (
        <Space>
          <MobileOutlined />
          屏幕投屏
        </Space>
      ),
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card
              title={
                <Space>
                  <DesktopOutlined />
                  阿里云云手机投屏
                </Space>
              }
            >
              <Alert
                message="投屏说明"
                description={
                  <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                    <li>投屏需要阿里云云手机实例 ID（从阿里云控制台获取）</li>
                    <li>需要 HTTPS 环境才能正常使用投屏功能</li>
                    <li>首次连接可能需要等待几秒钟加载 SDK</li>
                    <li>如果连接失败，请检查实例是否处于运行状态</li>
                  </ul>
                }
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Form layout="vertical">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="实例 ID (Instance ID)">
                      <Input
                        placeholder="例如: acp-xxx"
                        value={form.getFieldValue('instanceId') || presetInfo.instanceId}
                        onChange={(e) => form.setFieldValue('instanceId', e.target.value)}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="地域 (Region)">
                      <Select
                        value={form.getFieldValue('regionId') || presetInfo.regionId}
                        onChange={(value) => form.setFieldValue('regionId', value)}
                        options={[
                          { value: 'cn-hangzhou', label: '华东1（杭州）' },
                          { value: 'cn-shanghai', label: '华东2（上海）' },
                          { value: 'cn-beijing', label: '华北2（北京）' },
                          { value: 'cn-shenzhen', label: '华南1（深圳）' },
                          { value: 'cn-hongkong', label: '中国（香港）' },
                          { value: 'ap-southeast-1', label: '新加坡' },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item>
                  <Button
                    type="primary"
                    icon={<DesktopOutlined />}
                    onClick={() => setShowScreen(true)}
                  >
                    连接并显示屏幕
                  </Button>
                </Form.Item>
              </Form>

              {showScreen && (
                <div style={{ marginTop: 16 }}>
                  <Suspense fallback={
                    <div style={{ textAlign: 'center', padding: 100 }}>
                      <Spin size="large" />
                      <div style={{ marginTop: 16 }}>正在加载播放器...</div>
                    </div>
                  }>
                    <AliyunCloudPhonePlayer
                      testMode={true}
                      instanceId={form.getFieldValue('instanceId') || presetInfo.instanceId}
                      regionId={form.getFieldValue('regionId') || presetInfo.regionId}
                      onConnected={() => message.success('屏幕投屏连接成功')}
                      onDisconnected={() => message.warning('屏幕投屏已断开')}
                      onError={(err) => message.error(`投屏错误: ${err}`)}
                    />
                  </Suspense>
                </div>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="投屏架构说明">
              <Paragraph>
                <Text strong>为什么 ADB 连接成功后看不到屏幕？</Text>
              </Paragraph>
              <Paragraph type="secondary">
                ADB (Android Debug Bridge) 是一个命令行工具，主要用于：
              </Paragraph>
              <ul style={{ paddingLeft: 20 }}>
                <li>执行 Shell 命令</li>
                <li>安装/卸载应用</li>
                <li>推送/拉取文件</li>
                <li>查看日志</li>
              </ul>

              <Divider />

              <Paragraph>
                <Text strong>屏幕投屏需要专门的协议：</Text>
              </Paragraph>
              <ul style={{ paddingLeft: 20 }}>
                <li>
                  <Tag color="blue">阿里云云手机</Tag>
                  使用阿里云 Web SDK
                </li>
                <li>
                  <Tag color="green">Redroid 设备</Tag>
                  使用 WebRTC 协议
                </li>
                <li>
                  <Tag color="orange">本地设备</Tag>
                  使用 scrcpy 工具
                </li>
              </ul>

              <Divider />

              <Alert
                message="提示"
                description="如果需要在本地查看屏幕，可以使用 scrcpy 工具并指定 TCP 连接方式"
                type="warning"
              />
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <Title level={2}>
        <ApiOutlined /> ADB 连接测试 & 屏幕投屏
      </Title>
      <Paragraph type="secondary">
        测试云手机设备的 ADB 连接状态，验证网络配置是否正确，并可查看设备屏幕。
      </Paragraph>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </div>
  );
};

export default AdbConnectionTest;
