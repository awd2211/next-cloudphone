import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Tabs,
  Space,
  Alert,
  Badge,
  Descriptions,
  Switch,
  InputNumber,
  Row,
  Col,
  Statistic,
} from 'antd';
import {
  CloudOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  SaveOutlined,
  TestTubeOutlined,
} from '@ant-design/icons';
import {
  DeviceProvider,
  ProviderNames,
  ProviderIcons,
} from '@/types/provider';
import {
  getProviderConfig,
  updateProviderConfig,
  testProviderConnection,
  getProviderHealth,
} from '@/services/provider';

const ProviderConfiguration = () => {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState<Record<string, boolean>>({});
  const [health, setHealth] = useState<any[]>([]);
  const [dockerForm] = Form.useForm();
  const [huaweiForm] = Form.useForm();
  const [aliyunForm] = Form.useForm();
  const [physicalForm] = Form.useForm();

  // 加载健康状态
  const loadHealth = async () => {
    try {
      const res = await getProviderHealth();
      setHealth(res.data);
    } catch (error) {
      console.error('加载健康状态失败', error);
    }
  };

  // 加载配置
  const loadConfig = async (provider: DeviceProvider) => {
    try {
      const config = await getProviderConfig(provider);
      const formMap = {
        [DeviceProvider.DOCKER]: dockerForm,
        [DeviceProvider.HUAWEI]: huaweiForm,
        [DeviceProvider.ALIYUN]: aliyunForm,
        [DeviceProvider.PHYSICAL]: physicalForm,
      };
      formMap[provider]?.setFieldsValue(config);
    } catch (error) {
      console.error(`加载 ${provider} 配置失败`, error);
    }
  };

  useEffect(() => {
    loadHealth();
    Object.values(DeviceProvider).forEach(loadConfig);
  }, []);

  // 保存配置
  const handleSave = async (provider: DeviceProvider, values: any) => {
    setLoading(true);
    try {
      await updateProviderConfig(provider, values);
      message.success(`${ProviderNames[provider]} 配置已保存`);
      loadHealth();
    } catch (error) {
      message.error('保存配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 测试连接
  const handleTest = async (provider: DeviceProvider) => {
    setTestLoading((prev) => ({ ...prev, [provider]: true }));
    try {
      await testProviderConnection(provider);
      message.success(`${ProviderNames[provider]} 连接测试成功`);
      loadHealth();
    } catch (error: any) {
      message.error(`连接测试失败: ${error.message}`);
    } finally {
      setTestLoading((prev) => ({ ...prev, [provider]: false }));
    }
  };

  // 获取健康状态
  const getHealthStatus = (provider: DeviceProvider) => {
    const status = health.find((h) => h.provider === provider);
    if (!status) return null;

    return status.healthy ? (
      <Badge status="success" text="健康" />
    ) : (
      <Badge status="error" text={status.message || '异常'} />
    );
  };

  // Redroid 配置表单
  const renderDockerConfig = () => (
    <Card>
      <Alert
        message="本地 Redroid 配置"
        description="配置本地 Docker 环境的 Redroid 容器"
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Descriptions title="健康状态" bordered column={2} style={{ marginBottom: '24px' }}>
        <Descriptions.Item label="状态">{getHealthStatus(DeviceProvider.DOCKER)}</Descriptions.Item>
        <Descriptions.Item label="最后检查">
          {health.find((h) => h.provider === DeviceProvider.DOCKER)?.lastCheck || '-'}
        </Descriptions.Item>
      </Descriptions>

      <Form
        form={dockerForm}
        layout="vertical"
        onFinish={(values) => handleSave(DeviceProvider.DOCKER, values)}
      >
        <Form.Item
          name="dockerHost"
          label="Docker 主机"
          rules={[{ required: true }]}
          tooltip="Docker socket 路径或 TCP 地址"
        >
          <Input placeholder="/var/run/docker.sock 或 tcp://host:2375" />
        </Form.Item>

        <Form.Item name="enableGPU" label="启用 GPU" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="maxDevices" label="最大设备数" rules={[{ required: true }]}>
          <InputNumber min={1} max={1000} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="imageRegistry" label="镜像仓库">
          <Input placeholder="registry.example.com" />
        </Form.Item>

        <Space>
          <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
            保存配置
          </Button>
          <Button
            onClick={() => handleTest(DeviceProvider.DOCKER)}
            loading={testLoading[DeviceProvider.DOCKER]}
            icon={<TestTubeOutlined />}
          >
            测试连接
          </Button>
        </Space>
      </Form>
    </Card>
  );

  // 华为云配置表单
  const renderHuaweiConfig = () => (
    <Card>
      <Alert
        message="华为云 CPH 配置"
        description="配置华为云手机服务 API 凭证和参数"
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Descriptions title="健康状态" bordered column={2} style={{ marginBottom: '24px' }}>
        <Descriptions.Item label="状态">{getHealthStatus(DeviceProvider.HUAWEI)}</Descriptions.Item>
        <Descriptions.Item label="最后检查">
          {health.find((h) => h.provider === DeviceProvider.HUAWEI)?.lastCheck || '-'}
        </Descriptions.Item>
      </Descriptions>

      <Form
        form={huaweiForm}
        layout="vertical"
        onFinish={(values) => handleSave(DeviceProvider.HUAWEI, values)}
      >
        <Form.Item
          name="projectId"
          label="Project ID"
          rules={[{ required: true }]}
          tooltip="华为云项目 ID"
        >
          <Input placeholder="输入华为云 Project ID" />
        </Form.Item>

        <Form.Item
          name="accessKeyId"
          label="Access Key ID"
          rules={[{ required: true }]}
        >
          <Input placeholder="AK****************" />
        </Form.Item>

        <Form.Item
          name="secretAccessKey"
          label="Secret Access Key"
          rules={[{ required: true }]}
        >
          <Input.Password placeholder="SK****************" />
        </Form.Item>

        <Form.Item name="region" label="区域" rules={[{ required: true }]}>
          <Input placeholder="cn-north-4" />
        </Form.Item>

        <Form.Item name="endpoint" label="Endpoint">
          <Input placeholder="https://cph.cn-north-4.myhuaweicloud.com" />
        </Form.Item>

        <Form.Item name="defaultServerId" label="默认服务器 ID">
          <Input />
        </Form.Item>

        <Form.Item name="defaultImageId" label="默认镜像 ID">
          <Input />
        </Form.Item>

        <Form.Item name="enableSync" label="启用自动同步" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="syncInterval" label="同步间隔 (分钟)">
          <InputNumber min={1} max={60} style={{ width: '100%' }} />
        </Form.Item>

        <Space>
          <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
            保存配置
          </Button>
          <Button
            onClick={() => handleTest(DeviceProvider.HUAWEI)}
            loading={testLoading[DeviceProvider.HUAWEI]}
            icon={<TestTubeOutlined />}
          >
            测试连接
          </Button>
        </Space>
      </Form>
    </Card>
  );

  // 阿里云配置表单
  const renderAliyunConfig = () => (
    <Card>
      <Alert
        message="阿里云 ECP 配置"
        description="配置阿里云弹性云手机服务 API 凭证和参数"
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Descriptions title="健康状态" bordered column={2} style={{ marginBottom: '24px' }}>
        <Descriptions.Item label="状态">{getHealthStatus(DeviceProvider.ALIYUN)}</Descriptions.Item>
        <Descriptions.Item label="最后检查">
          {health.find((h) => h.provider === DeviceProvider.ALIYUN)?.lastCheck || '-'}
        </Descriptions.Item>
      </Descriptions>

      <Form
        form={aliyunForm}
        layout="vertical"
        onFinish={(values) => handleSave(DeviceProvider.ALIYUN, values)}
      >
        <Form.Item
          name="accessKeyId"
          label="Access Key ID"
          rules={[{ required: true }]}
        >
          <Input placeholder="LTAI****************" />
        </Form.Item>

        <Form.Item
          name="accessKeySecret"
          label="Access Key Secret"
          rules={[{ required: true }]}
        >
          <Input.Password placeholder="输入 Access Key Secret" />
        </Form.Item>

        <Form.Item name="region" label="区域" rules={[{ required: true }]}>
          <Input placeholder="cn-hangzhou" />
        </Form.Item>

        <Form.Item name="endpoint" label="Endpoint">
          <Input placeholder="ecp.cn-hangzhou.aliyuncs.com" />
        </Form.Item>

        <Form.Item name="defaultImageId" label="默认镜像 ID">
          <Input />
        </Form.Item>

        <Form.Item name="defaultInstanceType" label="默认实例类型">
          <Input placeholder="ecp.ce.large" />
        </Form.Item>

        <Form.Item name="enableSync" label="启用自动同步" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="syncInterval" label="同步间隔 (分钟)">
          <InputNumber min={1} max={60} style={{ width: '100%' }} />
        </Form.Item>

        <Space>
          <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
            保存配置
          </Button>
          <Button
            onClick={() => handleTest(DeviceProvider.ALIYUN)}
            loading={testLoading[DeviceProvider.ALIYUN]}
            icon={<TestTubeOutlined />}
          >
            测试连接
          </Button>
        </Space>
      </Form>
    </Card>
  );

  // 物理设备配置表单
  const renderPhysicalConfig = () => (
    <Card>
      <Alert
        message="物理设备配置"
        description="配置物理 Android 设备连接参数"
        type="info"
        showIcon
        style={{ marginBottom: '24px' }}
      />

      <Descriptions title="健康状态" bordered column={2} style={{ marginBottom: '24px' }}>
        <Descriptions.Item label="状态">
          {getHealthStatus(DeviceProvider.PHYSICAL)}
        </Descriptions.Item>
        <Descriptions.Item label="最后检查">
          {health.find((h) => h.provider === DeviceProvider.PHYSICAL)?.lastCheck || '-'}
        </Descriptions.Item>
      </Descriptions>

      <Form
        form={physicalForm}
        layout="vertical"
        onFinish={(values) => handleSave(DeviceProvider.PHYSICAL, values)}
      >
        <Form.Item name="enableMDNS" label="启用 mDNS 发现" valuePropName="checked">
          <Switch />
        </Form.Item>

        <Form.Item name="scanSubnet" label="扫描子网">
          <Input placeholder="192.168.1.0/24" />
        </Form.Item>

        <Form.Item name="adbPort" label="ADB 端口" initialValue={5555}>
          <InputNumber min={1} max={65535} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="scrcpyPort" label="Scrcpy 端口" initialValue={27183}>
          <InputNumber min={1} max={65535} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="maxBitrate" label="最大码率 (bps)" initialValue={8000000}>
          <InputNumber min={1000000} max={50000000} step={1000000} style={{ width: '100%' }} />
        </Form.Item>

        <Space>
          <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
            保存配置
          </Button>
          <Button
            onClick={() => handleTest(DeviceProvider.PHYSICAL)}
            loading={testLoading[DeviceProvider.PHYSICAL]}
            icon={<TestTubeOutlined />}
          >
            测试连接
          </Button>
        </Space>
      </Form>
    </Card>
  );

  return (
    <div style={{ padding: '24px' }}>
      <Card title="提供商配置" style={{ marginBottom: '24px' }}>
        <Row gutter={16}>
          {Object.values(DeviceProvider).map((provider) => {
            const status = health.find((h) => h.provider === provider);
            return (
              <Col span={6} key={provider}>
                <Card>
                  <Statistic
                    title={`${ProviderIcons[provider]} ${ProviderNames[provider]}`}
                    value={status?.healthy ? '正常' : '异常'}
                    valueStyle={{ color: status?.healthy ? '#3f8600' : '#cf1322' }}
                    prefix={
                      status?.healthy ? <CheckCircleOutlined /> : <CloseCircleOutlined />
                    }
                  />
                </Card>
              </Col>
            );
          })}
        </Row>
      </Card>

      <Tabs
        defaultActiveKey="docker"
        items={[
          {
            key: 'docker',
            label: `${ProviderIcons[DeviceProvider.DOCKER]} ${ProviderNames[DeviceProvider.DOCKER]}`,
            children: renderDockerConfig(),
          },
          {
            key: 'huawei',
            label: `${ProviderIcons[DeviceProvider.HUAWEI]} ${ProviderNames[DeviceProvider.HUAWEI]}`,
            children: renderHuaweiConfig(),
          },
          {
            key: 'aliyun',
            label: `${ProviderIcons[DeviceProvider.ALIYUN]} ${ProviderNames[DeviceProvider.ALIYUN]}`,
            children: renderAliyunConfig(),
          },
          {
            key: 'physical',
            label: `${ProviderIcons[DeviceProvider.PHYSICAL]} ${ProviderNames[DeviceProvider.PHYSICAL]}`,
            children: renderPhysicalConfig(),
          },
        ]}
      />
    </div>
  );
};

export default ProviderConfiguration;
