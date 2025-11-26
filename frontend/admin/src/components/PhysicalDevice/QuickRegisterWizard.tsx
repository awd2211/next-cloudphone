import React, { memo, useState, useCallback } from 'react';
import {
  Modal,
  Steps,
  Form,
  Input,
  Select,
  Button,
  Space,
  Card,
  Alert,
  Divider,
  Typography,
  Row,
  Col,
  message,
  Spin,
  Tag,
} from 'antd';
import {
  WifiOutlined,
  UsbOutlined,
  CheckCircleOutlined,
  DesktopOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import type { FormInstance } from 'antd';
import { NEUTRAL_LIGHT } from '@/theme';

const { Text, Title, Paragraph } = Typography;
const { Option } = Select;

/**
 * 连接方式类型
 */
type ConnectionType = 'network' | 'usb';

/**
 * 设备模板
 */
interface DeviceTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  defaults: {
    connectionType: ConnectionType;
    adbPort?: number;
    tags?: string[];
  };
}

/**
 * 预设设备模板
 */
const DEVICE_TEMPLATES: DeviceTemplate[] = [
  {
    id: 'phone-network',
    name: '手机 (网络)',
    description: '通过 Wi-Fi 网络连接的 Android 手机',
    icon: <WifiOutlined style={{ fontSize: '24px', color: '#1890ff' }} />,
    defaults: {
      connectionType: 'network',
      adbPort: 5555,
      tags: ['手机', '网络'],
    },
  },
  {
    id: 'phone-usb',
    name: '手机 (USB)',
    description: '通过 USB 数据线直连的 Android 手机',
    icon: <UsbOutlined style={{ fontSize: '24px', color: '#52c41a' }} />,
    defaults: {
      connectionType: 'usb',
      tags: ['手机', 'USB'],
    },
  },
  {
    id: 'tablet',
    name: '平板电脑',
    description: 'Android 平板电脑设备',
    icon: <DesktopOutlined style={{ fontSize: '24px', color: '#722ed1' }} />,
    defaults: {
      connectionType: 'network',
      adbPort: 5555,
      tags: ['平板'],
    },
  },
  {
    id: 'tv-box',
    name: '电视盒子',
    description: 'Android TV 或智能盒子',
    icon: <ThunderboltOutlined style={{ fontSize: '24px', color: '#fa8c16' }} />,
    defaults: {
      connectionType: 'network',
      adbPort: 5555,
      tags: ['盒子', 'TV'],
    },
  },
  {
    id: 'custom',
    name: '自定义配置',
    description: '手动配置所有连接参数',
    icon: <SettingOutlined style={{ fontSize: '24px', color: '#8c8c8c' }} />,
    defaults: {
      connectionType: 'network',
      adbPort: 5555,
    },
  },
];

interface QuickRegisterWizardProps {
  visible: boolean;
  onCancel: () => void;
  onFinish: (values: RegisterDeviceValues) => Promise<void>;
  isLoading?: boolean;
}

export interface RegisterDeviceValues {
  template?: string;
  serialNumber: string;
  name?: string;
  connectionType: ConnectionType;
  ipAddress?: string;
  adbPort?: number;
  tags?: string[];
}

/**
 * 设备快速注册向导
 *
 * 功能：
 * 1. 三步引导式注册
 * 2. 预设设备模板
 * 3. 智能默认值
 * 4. 连接测试
 */
export const QuickRegisterWizard = memo<QuickRegisterWizardProps>(
  ({ visible, onCancel, onFinish, isLoading = false }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [selectedTemplate, setSelectedTemplate] = useState<DeviceTemplate | null>(null);
    const [form] = Form.useForm<RegisterDeviceValues>();
    const [testingConnection, setTestingConnection] = useState(false);
    const [connectionTestResult, setConnectionTestResult] = useState<{
      success: boolean;
      message: string;
    } | null>(null);

    // 步骤定义
    const steps = [
      { title: '选择类型', icon: <RocketOutlined /> },
      { title: '填写信息', icon: <SettingOutlined /> },
      { title: '完成注册', icon: <CheckCircleOutlined /> },
    ];

    // 重置向导
    const resetWizard = useCallback(() => {
      setCurrentStep(0);
      setSelectedTemplate(null);
      setConnectionTestResult(null);
      form.resetFields();
    }, [form]);

    // 处理取消
    const handleCancel = useCallback(() => {
      resetWizard();
      onCancel();
    }, [resetWizard, onCancel]);

    // 选择模板
    const handleSelectTemplate = useCallback(
      (template: DeviceTemplate) => {
        setSelectedTemplate(template);
        form.setFieldsValue({
          template: template.id,
          connectionType: template.defaults.connectionType,
          adbPort: template.defaults.adbPort,
          tags: template.defaults.tags,
        });
        setCurrentStep(1);
      },
      [form]
    );

    // 测试连接
    const handleTestConnection = useCallback(async () => {
      try {
        await form.validateFields(['ipAddress', 'adbPort']);
        const values = form.getFieldsValue();

        setTestingConnection(true);
        setConnectionTestResult(null);

        // 模拟连接测试（实际应该调用 API）
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 假设测试成功
        setConnectionTestResult({
          success: true,
          message: `成功连接到 ${values.ipAddress}:${values.adbPort}`,
        });
      } catch (error) {
        setConnectionTestResult({
          success: false,
          message: '连接测试失败，请检查设备是否在线',
        });
      } finally {
        setTestingConnection(false);
      }
    }, [form]);

    // 下一步
    const handleNext = useCallback(async () => {
      if (currentStep === 1) {
        try {
          await form.validateFields();
          setCurrentStep(2);
        } catch (error) {
          // 表单验证失败
        }
      } else {
        setCurrentStep((prev) => prev + 1);
      }
    }, [currentStep, form]);

    // 上一步
    const handlePrev = useCallback(() => {
      setConnectionTestResult(null);
      setCurrentStep((prev) => prev - 1);
    }, []);

    // 完成注册
    const handleFinish = useCallback(async () => {
      try {
        const values = await form.validateFields();
        await onFinish(values);
        message.success('设备注册成功');
        handleCancel();
      } catch (error) {
        message.error('注册失败，请重试');
      }
    }, [form, onFinish, handleCancel]);

    // 渲染步骤 1：选择设备类型
    const renderStep1 = () => (
      <div style={{ padding: '16px 0' }}>
        <Title level={5} style={{ marginBottom: '16px' }}>
          选择设备类型
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: '24px' }}>
          选择一个预设模板，系统将自动填充推荐配置
        </Paragraph>

        <Row gutter={[16, 16]}>
          {DEVICE_TEMPLATES.map((template) => (
            <Col xs={24} sm={12} key={template.id}>
              <Card
                hoverable
                style={{
                  cursor: 'pointer',
                  borderColor: selectedTemplate?.id === template.id ? '#1890ff' : undefined,
                  backgroundColor:
                    selectedTemplate?.id === template.id ? '#e6f7ff' : undefined,
                }}
                onClick={() => handleSelectTemplate(template)}
              >
                <Space>
                  {template.icon}
                  <div>
                    <Text strong>{template.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {template.description}
                    </Text>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );

    // 渲染步骤 2：填写设备信息
    const renderStep2 = () => (
      <div style={{ padding: '16px 0' }}>
        <Alert
          message={`已选择：${selectedTemplate?.name}`}
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item name="template" hidden>
            <Input />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="设备序列号"
                name="serialNumber"
                rules={[{ required: true, message: '请输入设备序列号' }]}
                tooltip="运行 adb devices 获取"
              >
                <Input placeholder="例如: emulator-5554 或 192.168.1.100:5555" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="设备名称" name="name" tooltip="可选，方便识别设备">
                <Input placeholder="例如: 测试手机1" />
              </Form.Item>
            </Col>
          </Row>

          <Divider orientation="left">连接设置</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="连接方式"
                name="connectionType"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="network">
                    <Space>
                      <WifiOutlined />
                      网络 ADB
                    </Space>
                  </Option>
                  <Option value="usb">
                    <Space>
                      <UsbOutlined />
                      USB 直连
                    </Space>
                  </Option>
                </Select>
              </Form.Item>
            </Col>

            <Form.Item
              noStyle
              shouldUpdate={(prev, curr) => prev.connectionType !== curr.connectionType}
            >
              {({ getFieldValue }) =>
                getFieldValue('connectionType') === 'network' && (
                  <>
                    <Col span={8}>
                      <Form.Item
                        label="IP 地址"
                        name="ipAddress"
                        rules={[
                          { required: true, message: '请输入 IP 地址' },
                          {
                            pattern: /^(\d{1,3}\.){3}\d{1,3}$/,
                            message: 'IP 地址格式不正确',
                          },
                        ]}
                      >
                        <Input placeholder="192.168.1.100" />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Form.Item label="端口" name="adbPort" rules={[{ required: true }]}>
                        <Input type="number" placeholder="5555" />
                      </Form.Item>
                    </Col>
                  </>
                )
              }
            </Form.Item>
          </Row>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) => prev.connectionType !== curr.connectionType}
          >
            {({ getFieldValue }) =>
              getFieldValue('connectionType') === 'network' && (
                <div style={{ marginBottom: '16px' }}>
                  <Space>
                    <Button
                      onClick={handleTestConnection}
                      loading={testingConnection}
                      disabled={testingConnection}
                    >
                      测试连接
                    </Button>
                    {connectionTestResult && (
                      <Tag color={connectionTestResult.success ? 'success' : 'error'}>
                        {connectionTestResult.message}
                      </Tag>
                    )}
                  </Space>
                </div>
              )
            }
          </Form.Item>

          <Divider orientation="left">标签（可选）</Divider>

          <Form.Item label="设备标签" name="tags">
            <Select mode="tags" placeholder="添加标签便于分类管理">
              <Option value="生产">生产</Option>
              <Option value="测试">测试</Option>
              <Option value="开发">开发</Option>
            </Select>
          </Form.Item>
        </Form>

        {selectedTemplate?.id !== 'custom' &&
          form.getFieldValue('connectionType') === 'network' && (
            <Alert
              message="网络 ADB 配置提示"
              description={
                <div>
                  <p>确保设备已开启网络 ADB 调试：</p>
                  <pre
                    style={{
                      background: NEUTRAL_LIGHT.bg.layout,
                      padding: '8px',
                      borderRadius: '4px',
                      margin: '8px 0',
                    }}
                  >
                    adb tcpip 5555
                  </pre>
                  <p>设备和服务器需在同一网络内</p>
                </div>
              }
              type="warning"
              showIcon
            />
          )}
      </div>
    );

    // 渲染步骤 3：确认信息
    const renderStep3 = () => {
      const values = form.getFieldsValue();

      return (
        <div style={{ padding: '16px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <CheckCircleOutlined
              style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }}
            />
            <Title level={4}>确认注册信息</Title>
          </div>

          <Card>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary">设备类型</Text>
                <br />
                <Text strong>{selectedTemplate?.name}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">序列号</Text>
                <br />
                <Text strong>{values.serialNumber}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">设备名称</Text>
                <br />
                <Text strong>{values.name || '(未设置)'}</Text>
              </Col>
              <Col span={12}>
                <Text type="secondary">连接方式</Text>
                <br />
                <Text strong>
                  {values.connectionType === 'network' ? (
                    <Space>
                      <WifiOutlined /> 网络 ADB ({values.ipAddress}:{values.adbPort})
                    </Space>
                  ) : (
                    <Space>
                      <UsbOutlined /> USB 直连
                    </Space>
                  )}
                </Text>
              </Col>
              {values.tags && values.tags.length > 0 && (
                <Col span={24}>
                  <Text type="secondary">标签</Text>
                  <br />
                  <Space style={{ marginTop: '4px' }}>
                    {values.tags.map((tag) => (
                      <Tag key={tag}>{tag}</Tag>
                    ))}
                  </Space>
                </Col>
              )}
            </Row>
          </Card>

          <Alert
            message="注册后设备将自动尝试连接"
            description="如果设备在线，将在几秒内完成连接。您可以在设备列表中查看连接状态。"
            type="info"
            showIcon
            style={{ marginTop: '16px' }}
          />
        </div>
      );
    };

    // 渲染步骤内容
    const renderStepContent = () => {
      switch (currentStep) {
        case 0:
          return renderStep1();
        case 1:
          return renderStep2();
        case 2:
          return renderStep3();
        default:
          return null;
      }
    };

    // 渲染底部按钮
    const renderFooter = () => {
      return (
        <Space>
          {currentStep > 0 && (
            <Button onClick={handlePrev} disabled={isLoading}>
              上一步
            </Button>
          )}
          {currentStep < steps.length - 1 ? (
            <Button type="primary" onClick={handleNext} disabled={currentStep === 0}>
              下一步
            </Button>
          ) : (
            <Button type="primary" onClick={handleFinish} loading={isLoading}>
              完成注册
            </Button>
          )}
        </Space>
      );
    };

    return (
      <Modal
        title="快速注册物理设备"
        open={visible}
        onCancel={handleCancel}
        width={720}
        footer={renderFooter()}
        destroyOnClose
      >
        <Spin spinning={isLoading}>
          <Steps
            current={currentStep}
            items={steps.map((step) => ({
              title: step.title,
              icon: step.icon,
            }))}
            style={{ marginBottom: '24px' }}
          />

          {renderStepContent()}
        </Spin>
      </Modal>
    );
  }
);

QuickRegisterWizard.displayName = 'QuickRegisterWizard';

export default QuickRegisterWizard;
