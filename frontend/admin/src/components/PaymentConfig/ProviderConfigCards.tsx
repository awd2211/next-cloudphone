import React, { useState, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Badge,
  Descriptions,
  Tag,
  Button,
  Divider,
  Space,
  Spin,
  message,
  Tooltip,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ApiOutlined,
  SettingOutlined,
  SyncOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProviderConfigs,
  testProviderConnectionNew,
  toggleProviderEnabled,
} from '@/services/payment-admin';
import type {
  PaymentProviderConfigResponse,
  PaymentProviderType,
} from '@/services/payment-admin';
import { getProviderName } from './constants';
import { ProviderConfigModal } from './ProviderConfigModal';

interface ProviderConfigCardsProps {
  hasEditPermission: boolean;
}

// Provider 图标颜色
const PROVIDER_COLORS: Record<PaymentProviderType, string> = {
  stripe: '#635bff',
  paypal: '#003087',
  paddle: '#3d4f5f',
  wechat: '#07c160',
  alipay: '#1677ff',
};

export const ProviderConfigCards: React.FC<ProviderConfigCardsProps> = React.memo(
  ({ hasEditPermission }) => {
    const queryClient = useQueryClient();
    const [testingProvider, setTestingProvider] = useState<string | null>(null);
    const [configModalVisible, setConfigModalVisible] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<PaymentProviderType | null>(null);
    const [selectedConfig, setSelectedConfig] = useState<PaymentProviderConfigResponse | null>(null);

    // 获取所有配置
    const { data: configs, isLoading, refetch } = useQuery({
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

    if (isLoading) {
      return (
        <Card>
          <Spin tip="加载中..." />
        </Card>
      );
    }

    return (
      <>
        <Card
          title={
            <Space>
              <ApiOutlined />
              <span>支付提供商配置</span>
            </Space>
          }
          extra={
            <Button icon={<SyncOutlined />} onClick={() => refetch()}>
              刷新
            </Button>
          }
        >
          <Row gutter={[16, 16]}>
            {configs?.map((config) => (
              <Col xs={24} sm={12} lg={8} key={config.provider}>
                <Card
                  size="small"
                  title={
                    <Space>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: PROVIDER_COLORS[config.provider],
                          display: 'inline-block',
                        }}
                      />
                      {config.displayName || getProviderName(config.provider)}
                    </Space>
                  }
                  extra={
                    <Badge
                      status={config.enabled ? 'success' : 'default'}
                      text={config.enabled ? '已启用' : '已禁用'}
                    />
                  }
                  actions={[
                    <Tooltip key="toggle" title={config.enabled ? '禁用' : '启用'}>
                      <Button
                        type="text"
                        size="small"
                        onClick={() => handleToggleEnabled(config.provider, !config.enabled)}
                        disabled={!hasEditPermission}
                      >
                        {config.enabled ? '禁用' : '启用'}
                      </Button>
                    </Tooltip>,
                    <Tooltip key="test" title="测试连接">
                      <Button
                        type="text"
                        size="small"
                        loading={testingProvider === config.provider}
                        onClick={() => handleTestConnection(config.provider)}
                        disabled={!config.hasSecretKey}
                      >
                        测试
                      </Button>
                    </Tooltip>,
                    <Tooltip key="config" title="配置">
                      <Button
                        type="text"
                        size="small"
                        icon={<SettingOutlined />}
                        onClick={() => handleOpenConfig(config)}
                        disabled={!hasEditPermission}
                      >
                        配置
                      </Button>
                    </Tooltip>,
                  ]}
                >
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="模式">
                      <Tag
                        color={
                          config.mode === 'live' || config.mode === 'production'
                            ? 'green'
                            : 'orange'
                        }
                      >
                        {config.mode === 'live' || config.mode === 'production'
                          ? '生产模式'
                          : '测试模式'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="密钥状态">
                      {config.hasSecretKey ? (
                        <Tag icon={<KeyOutlined />} color="success">
                          已配置
                        </Tag>
                      ) : (
                        <Tag icon={<KeyOutlined />} color="warning">
                          未配置
                        </Tag>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="连接状态">
                      {config.lastTestSuccess === true ? (
                        <Tag icon={<CheckCircleOutlined />} color="success">
                          连接正常
                        </Tag>
                      ) : config.lastTestSuccess === false ? (
                        <Tag icon={<CloseCircleOutlined />} color="error">
                          连接失败
                        </Tag>
                      ) : (
                        <Tag color="default">未测试</Tag>
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                  {config.lastTestMessage && config.lastTestSuccess === false && (
                    <>
                      <Divider style={{ margin: '8px 0' }} />
                      <div style={{ color: '#ff4d4f', fontSize: 12 }}>
                        {config.lastTestMessage}
                      </div>
                    </>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* 配置弹窗 */}
        <ProviderConfigModal
          visible={configModalVisible}
          provider={selectedProvider}
          config={selectedConfig}
          onClose={() => setConfigModalVisible(false)}
          onSuccess={handleConfigSuccess}
        />
      </>
    );
  }
);

ProviderConfigCards.displayName = 'ProviderConfigCards';
