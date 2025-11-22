import { memo, useState } from 'react';
import {
  Card,
  Form,
  Input,
  InputNumber,
  Button,
  Switch,
  Select,
  Space,
  Divider,
  Alert,
  Row,
  Col,
  Typography,
  Tooltip,
} from 'antd';
import {
  SaveOutlined,
  SendOutlined,
  QuestionCircleOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import type { FormInstance } from 'antd';

const { Text, Link } = Typography;

// 邮件服务商配置
const EMAIL_PROVIDERS = [
  {
    value: 'smtp',
    label: 'SMTP 通用',
    description: '标准 SMTP 协议，支持任意邮件服务器',
    icon: '📧',
    fields: ['smtpHost', 'smtpPort', 'smtpSecure', 'smtpUser', 'smtpPassword'],
    helpUrl: null,
  },
  {
    value: 'mailgun',
    label: 'Mailgun',
    description: '高送达率 API 邮件服务，适合大批量发送',
    icon: '🔫',
    fields: ['mailgunApiKey', 'mailgunDomain', 'mailgunRegion'],
    helpUrl: 'https://documentation.mailgun.com/en/latest/quickstart.html',
  },
  {
    value: 'sendgrid',
    label: 'SendGrid',
    description: 'Twilio 旗下邮件服务，功能全面',
    icon: '📤',
    fields: ['sendgridApiKey'],
    helpUrl: 'https://docs.sendgrid.com/for-developers/sending-email/api-getting-started',
  },
  {
    value: 'ses',
    label: 'Amazon SES',
    description: 'AWS 邮件服务，性价比高，适合大规模发送',
    icon: '☁️',
    fields: ['sesRegion', 'sesAccessKeyId', 'sesSecretAccessKey'],
    helpUrl: 'https://docs.aws.amazon.com/ses/latest/dg/send-email.html',
  },
  {
    value: 'postmark',
    label: 'Postmark',
    description: '专注事务性邮件，送达速度快',
    icon: '📬',
    fields: ['postmarkServerToken'],
    helpUrl: 'https://postmarkapp.com/developer',
  },
  {
    value: 'resend',
    label: 'Resend',
    description: '新一代开发者友好邮件服务',
    icon: '✉️',
    fields: ['resendApiKey'],
    helpUrl: 'https://resend.com/docs/introduction',
  },
  {
    value: 'sparkpost',
    label: 'SparkPost',
    description: '企业级邮件发送平台，支持全球部署',
    icon: '⚡',
    fields: ['sparkpostApiKey', 'sparkpostRegion'],
    helpUrl: 'https://developers.sparkpost.com/',
  },
];

interface EmailSettingsTabProps {
  form: FormInstance;
  loading: boolean;
  testLoading: boolean;
  onFinish: (values: any) => void;
  onTest: () => void;
}

export const EmailSettingsTab = memo<EmailSettingsTabProps>(
  ({ form, loading, testLoading, onFinish, onTest }) => {
    const [selectedProvider, setSelectedProvider] = useState<string>(
      form.getFieldValue('emailProvider') || 'smtp'
    );

    const handleProviderChange = (value: string) => {
      setSelectedProvider(value);
      form.setFieldsValue({ emailProvider: value });
    };

    const currentProvider = EMAIL_PROVIDERS.find((p) => p.value === selectedProvider);

    return (
      <Card>
        <Alert
          message="邮件服务配置"
          description="配置邮件服务用于发送系统通知、验证码、密码重置等。支持多种海外主流邮件服务商。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="启用邮件服务"
            name="emailEnabled"
            valuePropName="checked"
            initialValue={false}
            extra="关闭后系统将不会发送任何邮件通知"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>

          <Divider>
            <GlobalOutlined /> 选择邮件服务商
          </Divider>

          <Form.Item
            label="邮件服务商"
            name="emailProvider"
            initialValue="smtp"
            extra={
              currentProvider?.helpUrl && (
                <Space>
                  <Text type="secondary">{currentProvider.description}</Text>
                  <Link href={currentProvider.helpUrl} target="_blank">
                    查看文档
                  </Link>
                </Space>
              )
            }
          >
            <Select onChange={handleProviderChange} size="large">
              {EMAIL_PROVIDERS.map((provider) => (
                <Select.Option key={provider.value} value={provider.value}>
                  <Space>
                    <span>{provider.icon}</span>
                    <span>{provider.label}</span>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {provider.description}
                    </Text>
                  </Space>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          {/* SMTP 通用配置 */}
          {selectedProvider === 'smtp' && (
            <>
              <Divider>SMTP 服务器配置</Divider>
              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item
                    label="SMTP服务器"
                    name="smtpHost"
                    rules={[{ required: true, message: '请输入SMTP服务器地址' }]}
                  >
                    <Input placeholder="smtp.example.com" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="SMTP端口"
                    name="smtpPort"
                    initialValue={587}
                    rules={[{ required: true, message: '请输入SMTP端口' }]}
                  >
                    <InputNumber min={1} max={65535} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                label="加密方式"
                name="smtpSecure"
                initialValue="tls"
                extra="TLS: 端口587 | SSL: 端口465 | NONE: 端口25"
              >
                <Select>
                  <Select.Option value="tls">TLS (推荐)</Select.Option>
                  <Select.Option value="ssl">SSL</Select.Option>
                  <Select.Option value="none">无加密</Select.Option>
                </Select>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="SMTP用户名"
                    name="smtpUser"
                    rules={[{ required: true, message: '请输入SMTP用户名' }]}
                  >
                    <Input placeholder="noreply@example.com" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="SMTP密码"
                    name="smtpPassword"
                    rules={[{ required: true, message: '请输入SMTP密码' }]}
                  >
                    <Input.Password placeholder="SMTP密码或授权码" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* Mailgun 配置 */}
          {selectedProvider === 'mailgun' && (
            <>
              <Divider>Mailgun 配置</Divider>
              <Alert
                message="获取 API 密钥"
                description={
                  <span>
                    登录{' '}
                    <Link href="https://app.mailgun.com/app/account/security/api_keys" target="_blank">
                      Mailgun 控制台
                    </Link>{' '}
                    获取 API Key 和发送域名
                  </span>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Form.Item
                label={
                  <Space>
                    API Key
                    <Tooltip title="在 Mailgun 控制台 Settings > API Keys 中获取">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="mailgunApiKey"
                rules={[{ required: true, message: '请输入 Mailgun API Key' }]}
              >
                <Input.Password placeholder="key-xxxxxxxxxxxxxxxx" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item
                    label={
                      <Space>
                        发送域名
                        <Tooltip title="需要在 Mailgun 中验证的域名，如 mg.yourdomain.com">
                          <QuestionCircleOutlined />
                        </Tooltip>
                      </Space>
                    }
                    name="mailgunDomain"
                    rules={[{ required: true, message: '请输入发送域名' }]}
                  >
                    <Input placeholder="mg.yourdomain.com" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="服务区域"
                    name="mailgunRegion"
                    initialValue="us"
                    extra="欧洲用户选择 EU"
                  >
                    <Select>
                      <Select.Option value="us">美国 (US)</Select.Option>
                      <Select.Option value="eu">欧洲 (EU)</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* SendGrid 配置 */}
          {selectedProvider === 'sendgrid' && (
            <>
              <Divider>SendGrid 配置</Divider>
              <Alert
                message="获取 API 密钥"
                description={
                  <span>
                    登录{' '}
                    <Link href="https://app.sendgrid.com/settings/api_keys" target="_blank">
                      SendGrid 控制台
                    </Link>{' '}
                    创建 API Key（需要 Mail Send 权限）
                  </span>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Form.Item
                label={
                  <Space>
                    API Key
                    <Tooltip title="在 SendGrid 控制台 Settings > API Keys 中创建">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="sendgridApiKey"
                rules={[{ required: true, message: '请输入 SendGrid API Key' }]}
              >
                <Input.Password placeholder="SG.xxxxxxxxxxxxxxxx" />
              </Form.Item>
            </>
          )}

          {/* Amazon SES 配置 */}
          {selectedProvider === 'ses' && (
            <>
              <Divider>Amazon SES 配置</Divider>
              <Alert
                message="配置说明"
                description={
                  <span>
                    需要在{' '}
                    <Link href="https://console.aws.amazon.com/ses/" target="_blank">
                      AWS SES 控制台
                    </Link>{' '}
                    验证发件域名并创建 IAM 凭证
                  </span>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Form.Item
                label="AWS 区域"
                name="sesRegion"
                initialValue="us-east-1"
                extra="选择距离目标用户最近的区域"
              >
                <Select>
                  <Select.Option value="us-east-1">美国东部 (us-east-1)</Select.Option>
                  <Select.Option value="us-west-2">美国西部 (us-west-2)</Select.Option>
                  <Select.Option value="eu-west-1">爱尔兰 (eu-west-1)</Select.Option>
                  <Select.Option value="eu-central-1">法兰克福 (eu-central-1)</Select.Option>
                  <Select.Option value="ap-southeast-1">新加坡 (ap-southeast-1)</Select.Option>
                  <Select.Option value="ap-southeast-2">悉尼 (ap-southeast-2)</Select.Option>
                  <Select.Option value="ap-northeast-1">东京 (ap-northeast-1)</Select.Option>
                </Select>
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="Access Key ID"
                    name="sesAccessKeyId"
                    rules={[{ required: true, message: '请输入 Access Key ID' }]}
                  >
                    <Input placeholder="AKIAIOSFODNN7EXAMPLE" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Secret Access Key"
                    name="sesSecretAccessKey"
                    rules={[{ required: true, message: '请输入 Secret Access Key' }]}
                  >
                    <Input.Password placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          {/* Postmark 配置 */}
          {selectedProvider === 'postmark' && (
            <>
              <Divider>Postmark 配置</Divider>
              <Alert
                message="获取 Server Token"
                description={
                  <span>
                    登录{' '}
                    <Link href="https://account.postmarkapp.com/servers" target="_blank">
                      Postmark 控制台
                    </Link>
                    ，选择服务器后在 API Tokens 中获取
                  </span>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Form.Item
                label={
                  <Space>
                    Server API Token
                    <Tooltip title="在 Postmark 服务器设置中的 API Tokens 页面获取">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="postmarkServerToken"
                rules={[{ required: true, message: '请输入 Postmark Server Token' }]}
              >
                <Input.Password placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              </Form.Item>
            </>
          )}

          {/* Resend 配置 */}
          {selectedProvider === 'resend' && (
            <>
              <Divider>Resend 配置</Divider>
              <Alert
                message="获取 API 密钥"
                description={
                  <span>
                    登录{' '}
                    <Link href="https://resend.com/api-keys" target="_blank">
                      Resend 控制台
                    </Link>{' '}
                    创建 API Key
                  </span>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Form.Item
                label={
                  <Space>
                    API Key
                    <Tooltip title="在 Resend Dashboard > API Keys 中创建">
                      <QuestionCircleOutlined />
                    </Tooltip>
                  </Space>
                }
                name="resendApiKey"
                rules={[{ required: true, message: '请输入 Resend API Key' }]}
              >
                <Input.Password placeholder="re_xxxxxxxxxxxxxxxx" />
              </Form.Item>
            </>
          )}

          {/* SparkPost 配置 */}
          {selectedProvider === 'sparkpost' && (
            <>
              <Divider>SparkPost 配置</Divider>
              <Alert
                message="获取 API 密钥"
                description={
                  <span>
                    登录{' '}
                    <Link href="https://app.sparkpost.com/account/api-keys" target="_blank">
                      SparkPost 控制台
                    </Link>{' '}
                    创建 API Key（需要 Transmissions: Read/Write 权限）
                  </span>
                }
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item
                    label={
                      <Space>
                        API Key
                        <Tooltip title="在 SparkPost 控制台 Account > API Keys 中创建">
                          <QuestionCircleOutlined />
                        </Tooltip>
                      </Space>
                    }
                    name="sparkpostApiKey"
                    rules={[{ required: true, message: '请输入 SparkPost API Key' }]}
                  >
                    <Input.Password placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="服务区域"
                    name="sparkpostRegion"
                    initialValue="us"
                    extra="欧洲用户选择 EU"
                  >
                    <Select>
                      <Select.Option value="us">美国 (US)</Select.Option>
                      <Select.Option value="eu">欧洲 (EU)</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}

          <Divider>发件人信息</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="发件人名称"
                name="fromName"
                rules={[{ required: true, message: '请输入发件人名称' }]}
              >
                <Input placeholder="云手机平台" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="发件人邮箱"
                name="fromEmail"
                rules={[
                  { required: true, message: '请输入发件人邮箱' },
                  { type: 'email', message: '请输入有效的邮箱地址' },
                ]}
                extra="需要在所选服务商中验证此域名"
              >
                <Input placeholder="noreply@example.com" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="回复邮箱"
            name="replyToEmail"
            rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
            extra="用户回复邮件时的收件地址，留空则使用发件人邮箱"
          >
            <Input placeholder="support@example.com" />
          </Form.Item>

          <Divider>高级选项</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="连接超时(秒)" name="connectionTimeout" initialValue={30}>
                <InputNumber min={5} max={120} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="每小时最大发送量"
                name="maxEmailsPerHour"
                initialValue={100}
                extra="防止邮件发送过于频繁"
              >
                <InputNumber min={1} max={10000} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="启用邮件追踪"
            name="enableTracking"
            valuePropName="checked"
            initialValue={true}
            extra="追踪邮件打开率和点击率（部分服务商支持）"
          >
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                保存设置
              </Button>
              <Button icon={<SendOutlined />} onClick={onTest} loading={testLoading}>
                发送测试邮件
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    );
  }
);

EmailSettingsTab.displayName = 'EmailSettingsTab';
