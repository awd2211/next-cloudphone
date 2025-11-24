import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Space,
  Tag,
  Alert,
  message,
  Badge,
  Button,
  Switch,
  Descriptions,
  Divider,
  Tooltip,
  Collapse,
} from 'antd';
import {
  ReloadOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  KeyOutlined,
  ApiOutlined,
  SyncOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PermissionGuard } from '@/components/PaymentConfig';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { usePermission } from '@/hooks';
import {
  getProviderConfigs,
  testProviderConnectionNew,
  toggleProviderEnabled,
} from '@/services/payment-admin';
import type {
  PaymentProviderConfigResponse,
  PaymentProviderType,
} from '@/services/payment-admin';
import { ProviderConfigModal } from '@/components/PaymentConfig/ProviderConfigModal';
import {
  getProviderName,
  getCurrencyName,
  SUPPORTED_CURRENCIES,
} from '@/components/PaymentConfig/constants';

// Provider 图标颜色
const PROVIDER_COLORS: Record<PaymentProviderType, string> = {
  stripe: '#635bff',
  paypal: '#003087',
  paddle: '#3d4f5f',
  wechat: '#07c160',
  alipay: '#1677ff',
};

const PaymentConfigPage: React.FC = () => {
  return (
    <ErrorBoundary boundaryName="PaymentConfig">
      <PermissionGuard permission="payment:config:view">
        <PaymentConfigContent />
      </PermissionGuard>
    </ErrorBoundary>
  );
};

const PaymentConfigContent: React.FC = () => {
  const { hasPermission } = usePermission();
  const hasEditPermission = hasPermission('payment:config:edit');
  const queryClient = useQueryClient();

  const {
    loading,
    config,
    loadConfig,
    handleToggleMethod,
    handleToggleCurrency,
  } = usePaymentConfig();

  // Provider configs
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProviderType | null>(null);
  const [selectedConfig, setSelectedConfig] = useState<PaymentProviderConfigResponse | null>(null);

  // 获取所有 Provider 配置
  const { data: providerConfigs, isLoading: providerLoading, refetch: refetchProviders } = useQuery({
    queryKey: ['provider-configs'],
    queryFn: getProviderConfigs,
    staleTime: 60 * 1000,
  });

  // 测试连接
  const testMutation = useMutation({
    mutationFn: testProviderConnectionNew,
    onSuccess: (result, provider) => {
      if (result.success) {
        message.success(`${getProviderName(provider)} 连接测试成功`);
      } else {
        message.error(`${getProviderName(provider)} 连接测试失败: ${result.message}`);
      }
      queryClient.invalidateQueries({ queryKey: ['provider-configs'] });
    },
    onError: (error: any, provider) => {
      message.error(`${getProviderName(provider)} 连接测试失败: ${error.message}`);
    },
  });

  // 切换启用状态
  const toggleMutation = useMutation({
    mutationFn: ({ provider, enabled }: { provider: PaymentProviderType; enabled: boolean }) =>
      toggleProviderEnabled(provider, enabled),
    onSuccess: (_, { provider, enabled }) => {
      message.success(`${getProviderName(provider)} ${enabled ? '已启用' : '已禁用'}`);
      queryClient.invalidateQueries({ queryKey: ['provider-configs'] });
    },
    onError: (error: any) => {
      message.error(`操作失败: ${error.message}`);
    },
  });

  // 快捷键支持 - Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        loadConfig();
        refetchProviders();
        message.info('正在刷新...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadConfig, refetchProviders]);

  const handleTestConnection = useCallback(async (provider: PaymentProviderType) => {
    setTestingProvider(provider);
    try {
      await testMutation.mutateAsync(provider);
    } finally {
      setTestingProvider(null);
    }
  }, [testMutation]);

  const handleToggleEnabled = useCallback((provider: PaymentProviderType, enabled: boolean) => {
    toggleMutation.mutate({ provider, enabled });
  }, [toggleMutation]);

  const handleOpenConfig = useCallback((config: PaymentProviderConfigResponse) => {
    setSelectedProvider(config.provider);
    setSelectedConfig(config);
    setConfigModalVisible(true);
  }, []);

  const handleConfigSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['provider-configs'] });
  }, [queryClient]);

  const handleRefreshAll = useCallback(() => {
    loadConfig();
    refetchProviders();
    message.info('正在刷新...');
  }, [loadConfig, refetchProviders]);

  // 检查支付方式是否启用
  const isMethodEnabled = (method: string): boolean => {
    return config?.enabledMethods?.includes(method) ?? false;
  };

  // 检查货币是否启用
  const isCurrencyEnabled = (currency: string): boolean => {
    return config?.enabledCurrencies?.includes(currency) ?? false;
  };

  const isLoading = loading || providerLoading;

  // 使用说明内容
  const helpContent = (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="配置说明"
        description={
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
            <li>在每个支付提供商卡片中，您可以配置 API 密钥和参数</li>
            <li>所有密钥信息均使用 AES-256-GCM 加密存储，确保安全</li>
            <li>配置完成后，点击"测试"按钮验证连接是否正常</li>
            <li>切换到生产模式前，请确保已配置正确的生产环境密钥</li>
          </ul>
        }
      />
      <Alert
        type="warning"
        showIcon
        message="安全提示"
        description={
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
            <li>请勿在非安全网络环境下配置密钥</li>
            <li>生产环境密钥应该只在生产环境中使用</li>
            <li>定期更换密钥以提高安全性</li>
            <li>如果怀疑密钥泄露，请立即在支付平台重新生成</li>
          </ul>
        }
      />
      <Alert
        type="success"
        showIcon
        message="Webhook 配置"
        description={
          <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
            <li>每个支付提供商都有自动生成的 Webhook URL</li>
            <li>请将 Webhook URL 配置到对应支付平台的后台</li>
            <li>Webhook 用于接收支付结果通知，确保配置正确</li>
          </ul>
        }
      />
    </Space>
  );

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ marginBottom: 0 }}>
            <ToolOutlined style={{ marginRight: 8 }} />
            支付配置管理
          </h2>
          <Space>
            <Tag
              icon={<ReloadOutlined spin={isLoading} />}
              color="processing"
              style={{ cursor: 'pointer' }}
              onClick={handleRefreshAll}
            >
              Ctrl+R 刷新
            </Tag>
            <Button
              icon={<SyncOutlined />}
              onClick={handleRefreshAll}
              loading={isLoading}
            >
              刷新全部
            </Button>
          </Space>
        </div>

        <LoadingState loading={isLoading} loadingType="skeleton" skeletonRows={6}>
          {/* 支付提供商配置 - 核心区域 */}
          <Card
            title={
              <Space>
                <ApiOutlined />
                <span>支付提供商配置</span>
                <Tag color="blue">{providerConfigs?.length || 0} 个提供商</Tag>
              </Space>
            }
          >
            <Alert
              message="提示"
              description="在此配置各支付提供商的 API 密钥，启用或禁用支付方式会立即生效。用户将只能看到已启用的支付方式。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Row gutter={[16, 16]}>
              {providerConfigs?.map((providerConfig) => {
                const method = providerConfig.provider;
                const methodEnabled = isMethodEnabled(method);

                return (
                  <Col xs={24} lg={12} xl={8} key={providerConfig.provider}>
                    <Card
                      size="small"
                      title={
                        <Space>
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              backgroundColor: PROVIDER_COLORS[providerConfig.provider],
                              display: 'inline-block',
                            }}
                          />
                          {providerConfig.displayName || getProviderName(providerConfig.provider)}
                        </Space>
                      }
                      extra={
                        <Space>
                          <Badge
                            status={providerConfig.enabled ? 'success' : 'default'}
                            text={providerConfig.enabled ? '已配置' : '未配置'}
                          />
                        </Space>
                      }
                      style={{
                        borderLeft: `3px solid ${PROVIDER_COLORS[providerConfig.provider]}`,
                      }}
                    >
                      <Descriptions column={1} size="small">
                        {/* 支付方式开关 - 新增 */}
                        <Descriptions.Item label="支付方式">
                          <Space>
                            <Switch
                              checked={methodEnabled}
                              onChange={(checked) => handleToggleMethod(method, checked)}
                              disabled={!hasEditPermission}
                              size="small"
                            />
                            {methodEnabled ? (
                              <Tag color="green" icon={<CheckCircleOutlined />}>已启用</Tag>
                            ) : (
                              <Tag icon={<CloseCircleOutlined />}>已禁用</Tag>
                            )}
                          </Space>
                        </Descriptions.Item>

                        <Descriptions.Item label="运行模式">
                          <Tag
                            color={
                              providerConfig.mode === 'live' || providerConfig.mode === 'production'
                                ? 'green'
                                : 'orange'
                            }
                          >
                            {providerConfig.mode === 'live' || providerConfig.mode === 'production'
                              ? '生产模式'
                              : '测试模式'}
                          </Tag>
                        </Descriptions.Item>

                        <Descriptions.Item label="密钥状态">
                          {providerConfig.hasSecretKey ? (
                            <Tag icon={<KeyOutlined />} color="success">已配置</Tag>
                          ) : (
                            <Tag icon={<KeyOutlined />} color="warning">未配置</Tag>
                          )}
                        </Descriptions.Item>

                        <Descriptions.Item label="连接状态">
                          {providerConfig.lastTestSuccess === true ? (
                            <Tag icon={<CheckCircleOutlined />} color="success">连接正常</Tag>
                          ) : providerConfig.lastTestSuccess === false ? (
                            <Tag icon={<CloseCircleOutlined />} color="error">连接失败</Tag>
                          ) : (
                            <Tag color="default">未测试</Tag>
                          )}
                        </Descriptions.Item>
                      </Descriptions>

                      {providerConfig.lastTestMessage && providerConfig.lastTestSuccess === false && (
                        <>
                          <Divider style={{ margin: '8px 0' }} />
                          <div style={{ color: '#ff4d4f', fontSize: 12 }}>
                            {providerConfig.lastTestMessage}
                          </div>
                        </>
                      )}

                      <Divider style={{ margin: '12px 0' }} />

                      {/* 操作按钮 */}
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Tooltip title={providerConfig.enabled ? '禁用提供商' : '启用提供商'}>
                          <Button
                            size="small"
                            type={providerConfig.enabled ? 'default' : 'primary'}
                            onClick={() => handleToggleEnabled(providerConfig.provider, !providerConfig.enabled)}
                            disabled={!hasEditPermission}
                          >
                            {providerConfig.enabled ? '禁用' : '启用'}
                          </Button>
                        </Tooltip>
                        <Space>
                          <Tooltip title="测试连接">
                            <Button
                              size="small"
                              loading={testingProvider === providerConfig.provider}
                              onClick={() => handleTestConnection(providerConfig.provider)}
                              disabled={!providerConfig.hasSecretKey}
                            >
                              测试
                            </Button>
                          </Tooltip>
                          <Tooltip title="配置 API 密钥">
                            <Button
                              size="small"
                              type="primary"
                              icon={<SettingOutlined />}
                              onClick={() => handleOpenConfig(providerConfig)}
                              disabled={!hasEditPermission}
                            >
                              配置
                            </Button>
                          </Tooltip>
                        </Space>
                      </Space>
                    </Card>
                  </Col>
                );
              })}

              {/* 余额支付卡片 - 独立显示 */}
              <Col xs={24} lg={12} xl={8}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: '#52c41a',
                          display: 'inline-block',
                        }}
                      />
                      余额支付
                    </Space>
                  }
                  extra={
                    <Badge
                      status={isMethodEnabled('balance') ? 'success' : 'default'}
                      text={isMethodEnabled('balance') ? '已启用' : '已禁用'}
                    />
                  }
                  style={{
                    borderLeft: '3px solid #52c41a',
                  }}
                >
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="支付方式">
                      <Space>
                        <Switch
                          checked={isMethodEnabled('balance')}
                          onChange={(checked) => handleToggleMethod('balance', checked)}
                          disabled={!hasEditPermission}
                          size="small"
                        />
                        {isMethodEnabled('balance') ? (
                          <Tag color="green" icon={<CheckCircleOutlined />}>已启用</Tag>
                        ) : (
                          <Tag icon={<CloseCircleOutlined />}>已禁用</Tag>
                        )}
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label="说明">
                      <span style={{ color: '#666', fontSize: 12 }}>
                        用户可使用账户余额进行支付，无需配置第三方 API
                      </span>
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
            </Row>
          </Card>

          {/* 货币管理 */}
          <Card
            title={
              <Space>
                <GlobalOutlined />
                <span>支持币种管理</span>
                <Tag color="blue">
                  {config?.enabledCurrencies?.length || 0} / {SUPPORTED_CURRENCIES.length} 种
                </Tag>
              </Space>
            }
          >
            <Alert
              message="提示"
              description="启用或禁用币种会影响用户可选择的支付货币。国际支付方式（Stripe、PayPal、Paddle）支持多币种，国内支付方式仅支持人民币。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Row gutter={[12, 12]}>
              {SUPPORTED_CURRENCIES.map((currency) => (
                <Col xs={12} sm={8} md={6} lg={4} xl={3} key={currency}>
                  <Card
                    size="small"
                    bodyStyle={{ padding: '8px 12px' }}
                    style={{
                      borderColor: isCurrencyEnabled(currency) ? '#52c41a' : undefined,
                    }}
                  >
                    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500, fontSize: 13 }}>
                        {getCurrencyName(currency)}
                      </span>
                      <Switch
                        size="small"
                        checked={isCurrencyEnabled(currency)}
                        onChange={(checked) => handleToggleCurrency(currency, checked)}
                        disabled={!hasEditPermission}
                      />
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          {/* 使用说明 - 折叠面板 */}
          <Collapse
            items={[
              {
                key: 'help',
                label: (
                  <Space>
                    <InfoCircleOutlined />
                    使用说明与安全提示
                  </Space>
                ),
                children: helpContent,
              },
            ]}
          />
        </LoadingState>
      </Space>

      {/* 配置弹窗 */}
      <ProviderConfigModal
        visible={configModalVisible}
        provider={selectedProvider}
        config={selectedConfig}
        onClose={() => setConfigModalVisible(false)}
        onSuccess={handleConfigSuccess}
      />
    </div>
  );
};

export default PaymentConfigPage;
