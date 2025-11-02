import React from 'react';
import { Card, Space, Button, Spin } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import {
  PermissionGuard,
  PaymentProviderCards,
  PaymentMethodsCard,
  CurrenciesCard,
  ConfigInfoCard,
} from '@/components/PaymentConfig';
import { usePaymentConfig } from '@/hooks/usePaymentConfig';
import { usePermission } from '@/hooks';

const PaymentConfigPage: React.FC = () => {
  return (
    <PermissionGuard permission="payment:config:view">
      <PaymentConfigContent />
    </PermissionGuard>
  );
};

const PaymentConfigContent: React.FC = () => {
  const { hasPermission } = usePermission();
  const {
    loading,
    config,
    testingProvider,
    loadConfig,
    handleToggleMethod,
    handleToggleCurrency,
    handleTestConnection,
  } = usePaymentConfig();

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
            <PaymentProviderCards
              config={config}
              testingProvider={testingProvider}
              hasEditPermission={hasPermission('payment:config:test')}
              onTestConnection={handleTestConnection}
            />
          )}

          {/* 支付方式管理 */}
          {config && (
            <PaymentMethodsCard
              config={config}
              hasEditPermission={hasPermission('payment:config:edit')}
              onToggleMethod={handleToggleMethod}
            />
          )}

          {/* 支持币种管理 */}
          {config && (
            <CurrenciesCard
              config={config}
              hasEditPermission={hasPermission('payment:config:edit')}
              onToggleCurrency={handleToggleCurrency}
            />
          )}

          {/* 配置说明 */}
          <ConfigInfoCard />
        </Space>
      </Spin>
    </div>
  );
};

export default PaymentConfigPage;
