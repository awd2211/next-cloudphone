import { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  InputNumber,
  Button,
  message,
  Switch,
  Select,
  Space,
  Divider,
  Alert,
  Row,
  Col,
} from 'antd';
import {
  SaveOutlined,
  SendOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import request from '../../utils/request';

const Settings = () => {
  const [basicForm] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [smsForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [storageForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testSmsLoading, setTestSmsLoading] = useState(false);
  const [selectedSmsProvider, setSelectedSmsProvider] = useState<string>('aliyun');

  // 加载设置
  const loadSettings = async () => {
    try {
      // 从后端 API 加载设置
      const response = await request.get('/settings');
      const settings = response.data;

      // 设置基本配置
      if (settings.basic) {
        basicForm.setFieldsValue(settings.basic);
      }

      // 设置邮件配置
      if (settings.email) {
        emailForm.setFieldsValue(settings.email);
      }

      // 设置短信配置
      if (settings.sms) {
        smsForm.setFieldsValue(settings.sms);
      }

      // 设置支付配置
      if (settings.payment) {
        paymentForm.setFieldsValue(settings.payment);
      }

      // 设置存储配置
      if (settings.storage) {
        storageForm.setFieldsValue(settings.storage);
      }
    } catch (error) {
      message.error('加载设置失败');
      console.error('Failed to load settings:', error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // 保存基本设置
  const handleSaveBasic = async (values: any) => {
    setLoading(true);
    try {
      // 调用后端 API 保存基本设置
      await request.put('/settings/basic', values);
      message.success('基本设置保存成功');
    } catch (error) {
      message.error('保存基本设置失败');
      console.error('Failed to save basic settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存邮件设置
  const handleSaveEmail = async (values: any) => {
    setLoading(true);
    try {
      await request.put('/settings/email', values);
      message.success('邮件设置保存成功');
    } catch (error) {
      message.error('保存邮件设置失败');
      console.error('Failed to save email settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存短信设置
  const handleSaveSms = async (values: any) => {
    setLoading(true);
    try {
      await request.put('/settings/sms', values);
      message.success('短信设置保存成功');
    } catch (error) {
      message.error('保存短信设置失败');
      console.error('Failed to save SMS settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存支付设置
  const handleSavePayment = async (values: any) => {
    setLoading(true);
    try {
      await request.put('/settings/payment', values);
      message.success('支付设置保存成功');
    } catch (error) {
      message.error('保存支付设置失败');
      console.error('Failed to save payment settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // 保存存储设置
  const handleSaveStorage = async (values: any) => {
    setLoading(true);
    try {
      await request.put('/settings/storage', values);
      message.success('存储设置保存成功');
    } catch (error) {
      message.error('保存存储设置失败');
      console.error('Failed to save storage settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // 测试邮件发送
  const handleTestEmail = async () => {
    try {
      const values = await emailForm.validateFields();
      setTestEmailLoading(true);
      await request.post('/settings/email/test', values);
      message.success('测试邮件发送成功，请检查收件箱');
    } catch (error) {
      message.error('测试邮件发送失败');
      console.error('Failed to send test email:', error);
    } finally {
      setTestEmailLoading(false);
    }
  };

  // 测试短信发送
  const handleTestSms = async () => {
    try {
      const values = await smsForm.validateFields();
      setTestSmsLoading(true);
      await request.post('/settings/sms/test', values);
      message.success('测试短信发送成功，请检查手机');
    } catch (error) {
      message.error('测试短信发送失败');
      console.error('Failed to send test SMS:', error);
    } finally {
      setTestSmsLoading(false);
    }
  };

  const items = [
    {
      key: 'basic',
      label: '基本设置',
      children: (
        <Card>
          <Form form={basicForm} layout="vertical" onFinish={handleSaveBasic}>
            <Form.Item
              label="网站名称"
              name="siteName"
              rules={[{ required: true, message: '请输入网站名称' }]}
            >
              <Input placeholder="请输入网站名称" />
            </Form.Item>

            <Form.Item
              label="网站URL"
              name="siteUrl"
              rules={[
                { required: true, message: '请输入网站URL' },
                { type: 'url', message: '请输入有效的URL' },
              ]}
            >
              <Input placeholder="https://example.com" />
            </Form.Item>

            <Form.Item label="Logo URL" name="logoUrl">
              <Input placeholder="https://example.com/logo.png" />
            </Form.Item>

            <Form.Item label="ICP备案号" name="icp">
              <Input placeholder="京ICP备12345678号" />
            </Form.Item>

            <Form.Item label="版权信息" name="copyright">
              <Input placeholder="© 2024 Your Company" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'email',
      label: '邮件设置',
      children: (
        <Card>
          <Alert
            message="邮件服务配置"
            description="配置 SMTP 服务用于发送系统通知邮件、验证码等"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
          <Form form={emailForm} layout="vertical" onFinish={handleSaveEmail}>
            <Form.Item
              label="启用邮件服务"
              name="emailEnabled"
              valuePropName="checked"
              initialValue={false}
              extra="关闭后系统将不会发送任何邮件通知"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>

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

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                  保存设置
                </Button>
                <Button
                  icon={<SendOutlined />}
                  onClick={handleTestEmail}
                  loading={testEmailLoading}
                >
                  发送测试邮件
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'sms',
      label: '短信设置',
      children: (
        <Card>
          <Alert
            message="短信服务配置"
            description="配置短信服务商用于发送验证码、通知等短信"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
          <Form form={smsForm} layout="vertical" onFinish={handleSaveSms}>
            <Form.Item
              label="启用短信服务"
              name="smsEnabled"
              valuePropName="checked"
              initialValue={false}
              extra="关闭后系统将不会发送任何短信通知"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>

            <Divider>短信服务商配置</Divider>

            <Form.Item
              label="短信服务商"
              name="smsProvider"
              rules={[{ required: true, message: '请选择短信服务商' }]}
              extra="不同服务商的配置参数可能有所不同"
            >
              <Select
                placeholder="请选择短信服务商"
                onChange={(value) => setSelectedSmsProvider(value)}
              >
                <Select.Option value="aliyun">阿里云短信 (推荐)</Select.Option>
                <Select.Option value="tencent">腾讯云短信</Select.Option>
                <Select.Option value="huawei">华为云短信</Select.Option>
                <Select.Option value="qiniu">七牛云短信</Select.Option>
                <Select.Option value="yunpian">云片短信</Select.Option>
              </Select>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="AccessKey ID"
                  name="smsAccessKeyId"
                  rules={[{ required: true, message: '请输入AccessKey ID' }]}
                  extra="从服务商控制台获取"
                >
                  <Input placeholder="请输入AccessKey ID" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="AccessKey Secret"
                  name="smsAccessKeySecret"
                  rules={[{ required: true, message: '请输入AccessKey Secret' }]}
                  extra="从服务商控制台获取"
                >
                  <Input.Password placeholder="请输入AccessKey Secret" />
                </Form.Item>
              </Col>
            </Row>

            {selectedSmsProvider === 'aliyun' && (
              <Form.Item
                label="Endpoint (可选)"
                name="smsEndpoint"
                extra="阿里云短信接口地址，默认为 dysmsapi.aliyuncs.com"
              >
                <Input placeholder="dysmsapi.aliyuncs.com" />
              </Form.Item>
            )}

            {selectedSmsProvider === 'tencent' && (
              <>
                <Form.Item
                  label="SDK AppID"
                  name="smsSdkAppId"
                  rules={[{ required: true, message: '请输入SDK AppID' }]}
                  extra="腾讯云短信 SDK AppID"
                >
                  <Input placeholder="请输入SDK AppID" />
                </Form.Item>
                <Form.Item
                  label="Region"
                  name="smsRegion"
                  initialValue="ap-guangzhou"
                  extra="腾讯云服务地域"
                >
                  <Select>
                    <Select.Option value="ap-guangzhou">华南 (广州)</Select.Option>
                    <Select.Option value="ap-beijing">华北 (北京)</Select.Option>
                    <Select.Option value="ap-shanghai">华东 (上海)</Select.Option>
                  </Select>
                </Form.Item>
              </>
            )}

            <Divider>短信签名与模板</Divider>

            <Form.Item
              label="短信签名"
              name="smsSignName"
              rules={[{ required: true, message: '请输入短信签名' }]}
              extra="短信签名需要在服务商平台审核通过后方可使用"
            >
              <Input placeholder="云手机平台" />
            </Form.Item>

            <Alert
              message="短信模板配置"
              description="短信模板请前往【系统管理 → 通知模板】进行配置和管理"
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginBottom: 16 }}
              action={
                <Button
                  size="small"
                  type="link"
                  onClick={() => window.open('/notifications/templates', '_blank')}
                >
                  前往配置
                </Button>
              }
            />

            <Divider>高级选项</Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="请求超时(秒)"
                  name="smsTimeout"
                  initialValue={30}
                  extra="短信API请求超时时间"
                >
                  <InputNumber min={5} max={120} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="每小时最大发送量"
                  name="maxSmsPerHour"
                  initialValue={100}
                  extra="防止短信发送过于频繁"
                >
                  <InputNumber min={1} max={10000} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="同一手机号发送间隔(秒)"
                  name="smsInterval"
                  initialValue={60}
                  extra="防止同一手机号频繁收到短信"
                >
                  <InputNumber min={30} max={600} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="验证码有效期(分钟)"
                  name="codeExpiry"
                  initialValue={5}
                  extra="短信验证码的有效时长"
                >
                  <InputNumber min={1} max={60} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="启用黑名单"
              name="enableBlacklist"
              valuePropName="checked"
              initialValue={true}
              extra="启用后，黑名单中的手机号将无法接收短信"
            >
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                  保存设置
                </Button>
                <Button icon={<SendOutlined />} onClick={handleTestSms} loading={testSmsLoading}>
                  发送测试短信
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'payment',
      label: '支付设置',
      children: (
        <Card>
          <Form form={paymentForm} layout="vertical" onFinish={handleSavePayment}>
            <h3>微信支付</h3>
            <Form.Item
              label="启用微信支付"
              name="wechatEnabled"
              valuePropName="checked"
              initialValue={false}
            >
              <Switch />
            </Form.Item>

            <Form.Item label="微信商户号" name="wechatMchId">
              <Input placeholder="请输入微信商户号" />
            </Form.Item>

            <Form.Item label="微信API密钥" name="wechatApiKey">
              <Input.Password placeholder="请输入微信API密钥" />
            </Form.Item>

            <h3 style={{ marginTop: 24 }}>支付宝</h3>
            <Form.Item
              label="启用支付宝"
              name="alipayEnabled"
              valuePropName="checked"
              initialValue={false}
            >
              <Switch />
            </Form.Item>

            <Form.Item label="支付宝AppID" name="alipayAppId">
              <Input placeholder="请输入支付宝AppID" />
            </Form.Item>

            <Form.Item label="支付宝私钥" name="alipayPrivateKey">
              <Input.TextArea placeholder="请输入支付宝私钥" rows={4} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'storage',
      label: '存储设置',
      children: (
        <Card>
          <Form form={storageForm} layout="vertical" onFinish={handleSaveStorage}>
            <Form.Item label="存储方式" name="storageType" initialValue="local">
              <Select>
                <Select.Option value="local">本地存储</Select.Option>
                <Select.Option value="oss">阿里云OSS</Select.Option>
                <Select.Option value="s3">Amazon S3</Select.Option>
                <Select.Option value="qiniu">七牛云</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item label="文件上传大小限制 (MB)" name="maxUploadSize" initialValue={100}>
              <InputNumber min={1} max={1024} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="OSS Endpoint" name="ossEndpoint">
              <Input placeholder="oss-cn-hangzhou.aliyuncs.com" />
            </Form.Item>

            <Form.Item label="OSS Bucket" name="ossBucket">
              <Input placeholder="my-bucket" />
            </Form.Item>

            <Form.Item label="OSS AccessKey ID" name="ossAccessKeyId">
              <Input placeholder="请输入AccessKey ID" />
            </Form.Item>

            <Form.Item label="OSS AccessKey Secret" name="ossAccessKeySecret">
              <Input.Password placeholder="请输入AccessKey Secret" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <h2>系统设置</h2>
      <Tabs items={items} />
    </div>
  );
};

export default Settings;
