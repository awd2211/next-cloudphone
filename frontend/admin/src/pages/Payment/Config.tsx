import React, { useEffect } from 'react';
import { Card, Space, Tag, Tabs, Alert, message } from 'antd';
import { ReloadOutlined, SettingOutlined, DollarOutlined, InfoCircleOutlined, ToolOutlined } from '@ant-design/icons';
import {
  PermissionGuard,
  PaymentMethodsCard,
  CurrenciesCard,
  ProviderConfigCards,
} from '@/components/PaymentConfig';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { usePermission } from '@/hooks';

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
  const {
    loading,
    config,
    loadConfig,
    handleToggleMethod,
    handleToggleCurrency,
  } = usePaymentConfig();

  // 快捷键支持 - Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        loadConfig();
        message.info('正在刷新...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadConfig]);

  const tabItems = [
    {
      key: 'providers',
      label: (
        <span>
          <SettingOutlined />
          支付提供商配置
        </span>
      ),
      children: (
        <ProviderConfigCards hasEditPermission={hasPermission('payment:config:edit')} />
      ),
    },
    {
      key: 'methods',
      label: (
        <span>
          <DollarOutlined />
          支付方式管理
        </span>
      ),
      children: (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {config && (
            <PaymentMethodsCard
              config={config}
              hasEditPermission={hasPermission('payment:config:edit')}
              onToggleMethod={handleToggleMethod}
            />
          )}
          {config && (
            <CurrenciesCard
              config={config}
              hasEditPermission={hasPermission('payment:config:edit')}
              onToggleCurrency={handleToggleCurrency}
            />
          )}
        </Space>
      ),
    },
    {
      key: 'help',
      label: (
        <span>
          <InfoCircleOutlined />
          使用说明
        </span>
      ),
      children: (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="配置说明"
            description={
              <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
                <li>在"支付提供商配置"选项卡中，您可以配置各支付平台的 API 密钥和参数</li>
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
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ marginBottom: 0 }}>
            <ToolOutlined style={{ marginRight: 8 }} />
            支付配置管理
            <Tag
              icon={<ReloadOutlined spin={loading} />}
              color="processing"
              style={{ marginLeft: 12, cursor: 'pointer' }}
              onClick={() => loadConfig()}
            >
              Ctrl+R 刷新
            </Tag>
          </h2>
        </div>

        {/* 标签页 */}
        <LoadingState loading={loading} loadingType="skeleton" skeletonRows={6}>
          <Card>
            <Tabs items={tabItems} defaultActiveKey="providers" />
          </Card>
        </LoadingState>
      </Space>
    </div>
  );
};

export default PaymentConfigPage;
