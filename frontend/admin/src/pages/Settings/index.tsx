import { useState, useEffect } from 'react';
import { Card, Tabs, Form, Input, InputNumber, Button, message, Switch, Select, Space } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import request from '../../utils/request';

const Settings = () => {
  const [basicForm] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [smsForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [storageForm] = Form.useForm();
  const [loading, setLoading] = useState(false);

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

  const items = [
    {
      key: 'basic',
      label: '基本设置',
      children: (
        <Card>
          <Form
            form={basicForm}
            layout="vertical"
            onFinish={handleSaveBasic}
          >
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
              rules={[{ required: true, message: '请输入网站URL' }, { type: 'url', message: '请输入有效的URL' }]}
            >
              <Input placeholder="https://example.com" />
            </Form.Item>

            <Form.Item
              label="Logo URL"
              name="logoUrl"
            >
              <Input placeholder="https://example.com/logo.png" />
            </Form.Item>

            <Form.Item
              label="ICP备案号"
              name="icp"
            >
              <Input placeholder="京ICP备12345678号" />
            </Form.Item>

            <Form.Item
              label="版权信息"
              name="copyright"
            >
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
          <Form
            form={emailForm}
            layout="vertical"
            onFinish={handleSaveEmail}
          >
            <Form.Item
              label="启用邮件服务"
              name="emailEnabled"
              valuePropName="checked"
              initialValue={false}
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="SMTP服务器"
              name="smtpHost"
            >
              <Input placeholder="smtp.example.com" />
            </Form.Item>

            <Form.Item
              label="SMTP端口"
              name="smtpPort"
              initialValue={587}
            >
              <InputNumber min={1} max={65535} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="SMTP用户名"
              name="smtpUser"
            >
              <Input placeholder="noreply@example.com" />
            </Form.Item>

            <Form.Item
              label="SMTP密码"
              name="smtpPassword"
            >
              <Input.Password placeholder="SMTP密码" />
            </Form.Item>

            <Form.Item
              label="发件人名称"
              name="fromName"
            >
              <Input placeholder="CloudPhone" />
            </Form.Item>

            <Form.Item
              label="发件人邮箱"
              name="fromEmail"
            >
              <Input placeholder="noreply@example.com" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                  保存设置
                </Button>
                <Button>发送测试邮件</Button>
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
          <Form
            form={smsForm}
            layout="vertical"
            onFinish={handleSaveSms}
          >
            <Form.Item
              label="启用短信服务"
              name="smsEnabled"
              valuePropName="checked"
              initialValue={false}
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="短信服务商"
              name="smsProvider"
            >
              <Select placeholder="请选择短信服务商">
                <Select.Option value="aliyun">阿里云</Select.Option>
                <Select.Option value="tencent">腾讯云</Select.Option>
                <Select.Option value="qiniu">七牛云</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="AccessKey ID"
              name="smsAccessKeyId"
            >
              <Input placeholder="请输入AccessKey ID" />
            </Form.Item>

            <Form.Item
              label="AccessKey Secret"
              name="smsAccessKeySecret"
            >
              <Input.Password placeholder="请输入AccessKey Secret" />
            </Form.Item>

            <Form.Item
              label="短信签名"
              name="smsSignName"
            >
              <Input placeholder="云手机" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
                  保存设置
                </Button>
                <Button>发送测试短信</Button>
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
          <Form
            form={paymentForm}
            layout="vertical"
            onFinish={handleSavePayment}
          >
            <h3>微信支付</h3>
            <Form.Item
              label="启用微信支付"
              name="wechatEnabled"
              valuePropName="checked"
              initialValue={false}
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="微信商户号"
              name="wechatMchId"
            >
              <Input placeholder="请输入微信商户号" />
            </Form.Item>

            <Form.Item
              label="微信API密钥"
              name="wechatApiKey"
            >
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

            <Form.Item
              label="支付宝AppID"
              name="alipayAppId"
            >
              <Input placeholder="请输入支付宝AppID" />
            </Form.Item>

            <Form.Item
              label="支付宝私钥"
              name="alipayPrivateKey"
            >
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
          <Form
            form={storageForm}
            layout="vertical"
            onFinish={handleSaveStorage}
          >
            <Form.Item
              label="存储方式"
              name="storageType"
              initialValue="local"
            >
              <Select>
                <Select.Option value="local">本地存储</Select.Option>
                <Select.Option value="oss">阿里云OSS</Select.Option>
                <Select.Option value="s3">Amazon S3</Select.Option>
                <Select.Option value="qiniu">七牛云</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="文件上传大小限制 (MB)"
              name="maxUploadSize"
              initialValue={100}
            >
              <InputNumber min={1} max={1024} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="OSS Endpoint"
              name="ossEndpoint"
            >
              <Input placeholder="oss-cn-hangzhou.aliyuncs.com" />
            </Form.Item>

            <Form.Item
              label="OSS Bucket"
              name="ossBucket"
            >
              <Input placeholder="my-bucket" />
            </Form.Item>

            <Form.Item
              label="OSS AccessKey ID"
              name="ossAccessKeyId"
            >
              <Input placeholder="请输入AccessKey ID" />
            </Form.Item>

            <Form.Item
              label="OSS AccessKey Secret"
              name="ossAccessKeySecret"
            >
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
