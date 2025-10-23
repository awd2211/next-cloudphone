import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Switch,
  Button,
  Space,
  Tag,
  message,
  Spin,
  Divider,
  Alert,
  Descriptions,
  Badge,
  Result,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ApiOutlined,
  DollarOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks';
import {
  getPaymentConfig,
  updatePaymentConfig,
  testProviderConnection,
  type PaymentConfig,
} from '@/services/payment-admin';

const PaymentConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const { hasPermission, loading: permissionLoading } = usePermission();

  // 权限检查
  if (permissionLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" tip="正在加载权限..." />
      </div>
    );
  }

  if (!hasPermission('payment:config:view')) {
    return (
      <div style={{ padding: '24px' }}>
        <Result
          status="403"
          title="403"
          subTitle="抱歉，您没有权限访问此页面。"
          icon={<LockOutlined />}
          extra={
            <Button type="primary" onClick={() => navigate('/')}>
              返回首页
            </Button>
          }
        />
      </div>
    );
  }

  return <PaymentConfigContent />;
};

const PaymentConfigContent: React.FC = () => {
  const { hasPermission } = usePermission();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // 加载配置
  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await getPaymentConfig();
      setConfig(res.data);
    } catch (error) {
      message.error('加载配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // 切换支付方式
  const handleToggleMethod = async (method: string, enabled: boolean) => {
    if (!config) return;

    const newEnabledMethods = enabled
      ? [...config.enabledMethods, method]
      : config.enabledMethods.filter((m) => m !== method);

    try {
      await updatePaymentConfig({ enabledMethods: newEnabledMethods });
      message.success(`${enabled ? '启用' : '禁用'}成功`);
      loadConfig();
    } catch (error) {
      message.error('更新配置失败');
    }
  };

  // 切换币种
  const handleToggleCurrency = async (currency: string, enabled: boolean) => {
    if (!config) return;

    const newEnabledCurrencies = enabled
      ? [...config.enabledCurrencies, currency]
      : config.enabledCurrencies.filter((c) => c !== currency);

    try {
      await updatePaymentConfig({ enabledCurrencies: newEnabledCurrencies });
      message.success(`${enabled ? '启用' : '禁用'}成功`);
      loadConfig();
    } catch (error) {
      message.error('更新配置失败');
    }
  };

  // 测试连接
  const handleTestConnection = async (provider: string) => {
    setTestingProvider(provider);
    try {
      await testProviderConnection(provider);
      message.success(`${provider} 连接测试成功`);
      loadConfig();
    } catch (error) {
      message.error(`${provider} 连接测试失败`);
    } finally {
      setTestingProvider(null);
    }
  };

  // 获取提供商显示名称
  const getProviderName = (provider: string): string => {
    const providerMap: Record<string, string> = {
      stripe: 'Stripe',
      paypal: 'PayPal',
      paddle: 'Paddle',
      wechat: '微信支付',
      alipay: '支付宝',
    };
    return providerMap[provider] || provider;
  };

  // 获取支付方式显示名称
  const getMethodName = (method: string): string => {
    const methodMap: Record<string, string> = {
      stripe: 'Stripe',
      paypal: 'PayPal',
      paddle: 'Paddle',
      wechat: '微信支付',
      alipay: '支付宝',
      balance: '余额支付',
    };
    return methodMap[method] || method;
  };

  // 获取币种显示名称
  const getCurrencyName = (currency: string): string => {
    const currencyMap: Record<string, string> = {
      CNY: '人民币 (CNY)',
      USD: '美元 (USD)',
      EUR: '欧元 (EUR)',
      GBP: '英镑 (GBP)',
      JPY: '日元 (JPY)',
      AUD: '澳元 (AUD)',
      CAD: '加元 (CAD)',
      CHF: '瑞士法郎 (CHF)',
      HKD: '港币 (HKD)',
      SGD: '新加坡元 (SGD)',
      INR: '印度卢比 (INR)',
      KRW: '韩元 (KRW)',
    };
    return currencyMap[currency] || currency;
  };

  const allMethods = ['stripe', 'paypal', 'paddle', 'wechat', 'alipay', 'balance'];
  const allCurrencies = [
    'CNY',
    'USD',
    'EUR',
    'GBP',
    'JPY',
    'AUD',
    'CAD',
    'CHF',
    'HKD',
    'SGD',
    'INR',
    'KRW',
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Spin spinning={loading}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 页面标题 */}
          <Card>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <h2 style={{ margin: 0 }}>支付配置管理</h2>
              <Button icon={<ReloadOutlined />} onClick={loadConfig}>
                刷新
              </Button>
            </Space>
          </Card>

          {/* 支付提供商状态 */}
          {config && (
            <Card title={<><ApiOutlined /> 支付提供商状态</>}>
              <Row gutter={[16, 16]}>
                {Object.entries(config.providers).map(([provider, providerConfig]) => (
                  <Col xs={24} sm={12} md={8} key={provider}>
                    <Card
                      size="small"
                      title={getProviderName(provider)}
                      extra={
                        <Badge
                          status={providerConfig.enabled ? 'success' : 'default'}
                          text={providerConfig.enabled ? '已启用' : '已禁用'}
                        />
                      }
                    >
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="模式">
                          <Tag color={providerConfig.mode === 'live' ? 'green' : 'orange'}>
                            {providerConfig.mode === 'live' ? '生产模式' : '测试模式'}
                          </Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="连接状态">
                          {providerConfig.connected.success ? (
                            <Tag icon={<CheckCircleOutlined />} color="success">
                              连接正常
                            </Tag>
                          ) : (
                            <Tag icon={<CloseCircleOutlined />} color="error">
                              连接失败
                            </Tag>
                          )}
                        </Descriptions.Item>
                        {!providerConfig.connected.success && (
                          <Descriptions.Item label="错误信息">
                            <span style={{ color: '#ff4d4f', fontSize: '12px' }}>
                              {providerConfig.connected.message}
                            </span>
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                      <Divider style={{ margin: '12px 0' }} />
                      <Button
                        block
                        size="small"
                        loading={testingProvider === provider}
                        onClick={() => handleTestConnection(provider)}
                        disabled={!hasPermission('payment:config:test')}
                      >
                        测试连接
                      </Button>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          {/* 支付方式管理 */}
          {config && (
            <Card title={<><DollarOutlined /> 支付方式管理</>}>
              <Alert
                message="提示"
                description="启用或禁用支付方式会立即生效，用户将只能看到已启用的支付方式。"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Row gutter={[16, 16]}>
                {allMethods.map((method) => (
                  <Col xs={24} sm={12} md={8} key={method}>
                    <Card size="small">
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space>
                          <span style={{ fontWeight: 500 }}>{getMethodName(method)}</span>
                          {config.enabledMethods.includes(method) ? (
                            <Tag color="green">已启用</Tag>
                          ) : (
                            <Tag>已禁用</Tag>
                          )}
                        </Space>
                        <Switch
                          checked={config.enabledMethods.includes(method)}
                          onChange={(checked) => handleToggleMethod(method, checked)}
                          disabled={!hasPermission('payment:config:edit')}
                        />
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          {/* 支持币种管理 */}
          {config && (
            <Card title="支持币种管理">
              <Alert
                message="提示"
                description="启用或禁用币种会影响用户可选择的支付货币。国际支付方式（Stripe、PayPal、Paddle）支持多币种，国内支付方式仅支持人民币。"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />
              <Row gutter={[16, 16]}>
                {allCurrencies.map((currency) => (
                  <Col xs={24} sm={12} md={6} key={currency}>
                    <Card size="small">
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Space>
                          <span style={{ fontWeight: 500 }}>
                            {getCurrencyName(currency)}
                          </span>
                          {config.enabledCurrencies.includes(currency) ? (
                            <Tag color="green">已启用</Tag>
                          ) : (
                            <Tag>已禁用</Tag>
                          )}
                        </Space>
                        <Switch
                          checked={config.enabledCurrencies.includes(currency)}
                          onChange={(checked) => handleToggleCurrency(currency, checked)}
                          disabled={!hasPermission('payment:config:edit')}
                        />
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          {/* 配置说明 */}
          <Card title="配置说明">
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <h4>环境配置</h4>
                <p style={{ color: '#666' }}>
                  支付提供商的 API 密钥、模式等配置需要在后端环境变量中设置。请查看
                  <code style={{ margin: '0 4px' }}>backend/billing-service/.env</code>
                  文件中的配置项。
                </p>
              </div>
              <div>
                <h4>测试模式</h4>
                <p style={{ color: '#666' }}>
                  在测试模式下，支付不会实际扣款，仅用于功能测试。切换到生产模式前，请确保已配置正确的生产环境密钥。
                </p>
              </div>
              <div>
                <h4>连接测试</h4>
                <p style={{ color: '#666' }}>
                  点击"测试连接"按钮可以验证支付提供商的配置是否正确。如果测试失败，请检查环境变量配置和网络连接。
                </p>
              </div>
            </Space>
          </Card>
        </Space>
      </Spin>
    </div>
  );
};

export default PaymentConfigPage;
