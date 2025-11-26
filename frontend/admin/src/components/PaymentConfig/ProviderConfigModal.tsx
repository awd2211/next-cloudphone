import React, { useEffect } from 'react';
import {
  Modal,
  Form,
  Input,
  Switch,
  Select,
  Divider,
  Alert,
  Space,
  Typography,
  Tag,
  message,
} from 'antd';
import {
  LockOutlined,
  KeyOutlined,
  GlobalOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import type {
  PaymentProviderConfigResponse,
  PaymentProviderConfigUpdate,
  PaymentProviderType,
  PaymentProviderMode,
} from '@/services/payment-admin';
import { updateProviderConfig } from '@/services/payment-admin';
import { getProviderName } from './constants';
import { SEMANTIC } from '@/theme';

const { Text } = Typography;
const { TextArea } = Input;

interface ProviderConfigModalProps {
  visible: boolean;
  provider: PaymentProviderType | null;
  config: PaymentProviderConfigResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

// 各 Provider 的模式选项
const MODE_OPTIONS: Record<PaymentProviderType, { value: PaymentProviderMode; label: string }[]> = {
  stripe: [
    { value: 'test', label: '测试模式 (Test)' },
    { value: 'live', label: '生产模式 (Live)' },
  ],
  paypal: [
    { value: 'sandbox', label: '沙盒模式 (Sandbox)' },
    { value: 'production', label: '生产模式 (Production)' },
  ],
  paddle: [
    { value: 'sandbox', label: '沙盒模式 (Sandbox)' },
    { value: 'production', label: '生产模式 (Production)' },
  ],
  wechat: [
    { value: 'test', label: '测试模式' },
    { value: 'live', label: '生产模式' },
  ],
  alipay: [
    { value: 'test', label: '测试模式 (沙盒)' },
    { value: 'live', label: '生产模式' },
  ],
};

export const ProviderConfigModal: React.FC<ProviderConfigModalProps> = ({
  visible,
  provider,
  config,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    if (visible && config) {
      // 设置表单初始值
      form.setFieldsValue({
        enabled: config.enabled,
        mode: config.mode,
        displayName: config.displayName,
        // Stripe
        stripeTestPublicKey: config.stripeTestPublicKey,
        stripeLivePublicKey: config.stripeLivePublicKey,
        // PayPal
        paypalSandboxClientId: config.paypalSandboxClientId,
        paypalLiveClientId: config.paypalLiveClientId,
        paypalWebhookId: config.paypalWebhookId,
        // WeChat
        wechatAppId: config.wechatAppId,
        wechatMchId: config.wechatMchId,
        // Alipay
        alipayAppId: config.alipayAppId,
        alipayGateway: config.alipayGateway,
      });
    }
  }, [visible, config, form]);

  const handleSubmit = async () => {
    if (!provider) return;

    try {
      const values = await form.validateFields();
      setLoading(true);

      // 构建更新数据，只包含非空的密钥字段
      const updateData: PaymentProviderConfigUpdate = {
        enabled: values.enabled,
        mode: values.mode,
        displayName: values.displayName,
      };

      // 根据 provider 类型添加特定字段
      switch (provider) {
        case 'stripe':
          if (values.stripeTestPublicKey) updateData.stripeTestPublicKey = values.stripeTestPublicKey;
          if (values.stripeTestSecretKey) updateData.stripeTestSecretKey = values.stripeTestSecretKey;
          if (values.stripeLivePublicKey) updateData.stripeLivePublicKey = values.stripeLivePublicKey;
          if (values.stripeLiveSecretKey) updateData.stripeLiveSecretKey = values.stripeLiveSecretKey;
          if (values.stripeWebhookSecret) updateData.stripeWebhookSecret = values.stripeWebhookSecret;
          break;
        case 'paypal':
          if (values.paypalSandboxClientId) updateData.paypalSandboxClientId = values.paypalSandboxClientId;
          if (values.paypalSandboxSecret) updateData.paypalSandboxSecret = values.paypalSandboxSecret;
          if (values.paypalLiveClientId) updateData.paypalLiveClientId = values.paypalLiveClientId;
          if (values.paypalLiveSecret) updateData.paypalLiveSecret = values.paypalLiveSecret;
          if (values.paypalWebhookId) updateData.paypalWebhookId = values.paypalWebhookId;
          break;
        case 'paddle':
          if (values.paddleApiKey) updateData.paddleApiKey = values.paddleApiKey;
          if (values.paddleWebhookSecret) updateData.paddleWebhookSecret = values.paddleWebhookSecret;
          break;
        case 'wechat':
          if (values.wechatAppId) updateData.wechatAppId = values.wechatAppId;
          if (values.wechatMchId) updateData.wechatMchId = values.wechatMchId;
          if (values.wechatSerialNo) updateData.wechatSerialNo = values.wechatSerialNo;
          if (values.wechatApiV3Key) updateData.wechatApiV3Key = values.wechatApiV3Key;
          if (values.wechatPrivateKey) updateData.wechatPrivateKey = values.wechatPrivateKey;
          if (values.wechatPublicKey) updateData.wechatPublicKey = values.wechatPublicKey;
          break;
        case 'alipay':
          if (values.alipayAppId) updateData.alipayAppId = values.alipayAppId;
          if (values.alipayPrivateKey) updateData.alipayPrivateKey = values.alipayPrivateKey;
          if (values.alipayPublicKey) updateData.alipayPublicKey = values.alipayPublicKey;
          if (values.alipayGateway) updateData.alipayGateway = values.alipayGateway;
          break;
      }

      await updateProviderConfig(provider, updateData);
      message.success('配置更新成功');
      onSuccess();
      onClose();
    } catch (error: any) {
      message.error(error.message || '配置更新失败');
    } finally {
      setLoading(false);
    }
  };

  const renderStripeForm = () => (
    <>
      <Divider orientation="left">测试环境密钥</Divider>
      <Form.Item name="stripeTestPublicKey" label="Test Publishable Key">
        <Input prefix={<KeyOutlined />} placeholder="pk_test_..." />
      </Form.Item>
      <Form.Item
        name="stripeTestSecretKey"
        label="Test Secret Key"
        extra={config?.hasSecretKey ? `当前已配置: ${config.secretKeyMasked}` : '未配置'}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="留空则不修改" />
      </Form.Item>

      <Divider orientation="left">生产环境密钥</Divider>
      <Form.Item name="stripeLivePublicKey" label="Live Publishable Key">
        <Input prefix={<KeyOutlined />} placeholder="pk_live_..." />
      </Form.Item>
      <Form.Item name="stripeLiveSecretKey" label="Live Secret Key">
        <Input.Password prefix={<LockOutlined />} placeholder="留空则不修改" />
      </Form.Item>

      <Divider orientation="left">Webhook 配置</Divider>
      <Form.Item name="stripeWebhookSecret" label="Webhook Secret">
        <Input.Password prefix={<LockOutlined />} placeholder="whsec_..." />
      </Form.Item>
    </>
  );

  const renderPayPalForm = () => (
    <>
      <Divider orientation="left">Sandbox 环境</Divider>
      <Form.Item name="paypalSandboxClientId" label="Sandbox Client ID">
        <Input prefix={<KeyOutlined />} placeholder="Client ID..." />
      </Form.Item>
      <Form.Item name="paypalSandboxSecret" label="Sandbox Secret">
        <Input.Password prefix={<LockOutlined />} placeholder="留空则不修改" />
      </Form.Item>

      <Divider orientation="left">Production 环境</Divider>
      <Form.Item name="paypalLiveClientId" label="Live Client ID">
        <Input prefix={<KeyOutlined />} placeholder="Client ID..." />
      </Form.Item>
      <Form.Item name="paypalLiveSecret" label="Live Secret">
        <Input.Password prefix={<LockOutlined />} placeholder="留空则不修改" />
      </Form.Item>

      <Divider orientation="left">Webhook 配置</Divider>
      <Form.Item name="paypalWebhookId" label="Webhook ID">
        <Input placeholder="Webhook ID..." />
      </Form.Item>
    </>
  );

  const renderPaddleForm = () => (
    <>
      <Divider orientation="left">API 配置</Divider>
      <Form.Item name="paddleApiKey" label="API Key">
        <Input.Password prefix={<LockOutlined />} placeholder="留空则不修改" />
      </Form.Item>
      <Form.Item name="paddleWebhookSecret" label="Webhook Secret">
        <Input.Password prefix={<LockOutlined />} placeholder="留空则不修改" />
      </Form.Item>
    </>
  );

  const renderWeChatForm = () => (
    <>
      <Divider orientation="left">基本配置</Divider>
      <Form.Item name="wechatAppId" label="App ID">
        <Input placeholder="微信应用 ID" />
      </Form.Item>
      <Form.Item name="wechatMchId" label="商户号">
        <Input placeholder="微信支付商户号" />
      </Form.Item>
      <Form.Item name="wechatSerialNo" label="证书序列号">
        <Input placeholder="API 证书序列号" />
      </Form.Item>

      <Divider orientation="left">密钥配置</Divider>
      <Form.Item name="wechatApiV3Key" label="API V3 密钥">
        <Input.Password prefix={<LockOutlined />} placeholder="留空则不修改" />
      </Form.Item>
      <Form.Item name="wechatPrivateKey" label="商户私钥">
        <TextArea rows={4} placeholder="-----BEGIN PRIVATE KEY-----\n..." />
      </Form.Item>
      <Form.Item name="wechatPublicKey" label="平台公钥">
        <TextArea rows={4} placeholder="-----BEGIN PUBLIC KEY-----\n..." />
      </Form.Item>
    </>
  );

  const renderAlipayForm = () => (
    <>
      <Divider orientation="left">基本配置</Divider>
      <Form.Item name="alipayAppId" label="App ID">
        <Input placeholder="支付宝应用 ID" />
      </Form.Item>
      <Form.Item name="alipayGateway" label="网关地址">
        <Input
          prefix={<GlobalOutlined />}
          placeholder="https://openapi.alipay.com/gateway.do"
        />
      </Form.Item>

      <Divider orientation="left">密钥配置</Divider>
      <Form.Item name="alipayPrivateKey" label="应用私钥">
        <TextArea rows={4} placeholder="RSA2 私钥..." />
      </Form.Item>
      <Form.Item name="alipayPublicKey" label="支付宝公钥">
        <TextArea rows={4} placeholder="支付宝公钥..." />
      </Form.Item>
    </>
  );

  const renderProviderForm = () => {
    switch (provider) {
      case 'stripe':
        return renderStripeForm();
      case 'paypal':
        return renderPayPalForm();
      case 'paddle':
        return renderPaddleForm();
      case 'wechat':
        return renderWeChatForm();
      case 'alipay':
        return renderAlipayForm();
      default:
        return null;
    }
  };

  return (
    <Modal
      title={`配置 ${provider ? getProviderName(provider) : ''}`}
      open={visible}
      onOk={handleSubmit}
      onCancel={onClose}
      confirmLoading={loading}
      width={700}
      destroyOnClose
    >
      {config && (
        <>
          {/* 状态信息 */}
          <Alert
            type={config.hasSecretKey ? 'success' : 'warning'}
            message={
              <Space>
                {config.hasSecretKey ? (
                  <>
                    <CheckCircleOutlined style={{ color: SEMANTIC.success.main }} />
                    <Text>密钥已配置</Text>
                  </>
                ) : (
                  <>
                    <CloseCircleOutlined style={{ color: SEMANTIC.warning.main }} />
                    <Text>密钥未配置</Text>
                  </>
                )}
                {config.lastTestedAt && (
                  <Tag color={config.lastTestSuccess ? 'success' : 'error'}>
                    最近测试: {config.lastTestSuccess ? '成功' : '失败'}
                  </Tag>
                )}
              </Space>
            }
            style={{ marginBottom: 16 }}
          />

          {/* Webhook URL */}
          {config.webhookUrl && (
            <Alert
              type="info"
              message={
                <Space direction="vertical" size={0}>
                  <Text strong>Webhook URL</Text>
                  <Text copyable code style={{ fontSize: 12 }}>
                    {config.webhookUrl}
                  </Text>
                </Space>
              }
              style={{ marginBottom: 16 }}
            />
          )}

          <Form form={form} layout="vertical">
            {/* 通用配置 */}
            <Form.Item name="enabled" label="启用状态" valuePropName="checked">
              <Switch checkedChildren="启用" unCheckedChildren="禁用" />
            </Form.Item>

            <Form.Item name="mode" label="运行模式">
              <Select options={provider ? MODE_OPTIONS[provider] : []} />
            </Form.Item>

            <Form.Item name="displayName" label="显示名称">
              <Input placeholder="自定义显示名称" />
            </Form.Item>

            {/* Provider 特定配置 */}
            {renderProviderForm()}
          </Form>
        </>
      )}
    </Modal>
  );
};

ProviderConfigModal.displayName = 'ProviderConfigModal';
