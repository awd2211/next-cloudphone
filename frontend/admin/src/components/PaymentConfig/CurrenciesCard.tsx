import React from 'react';
import { Card, Row, Col, Switch, Space, Tag, Alert } from 'antd';
import type { PaymentConfig } from '@/services/payment-admin';
import { SUPPORTED_CURRENCIES, getCurrencyName } from './constants';

interface CurrenciesCardProps {
  config: PaymentConfig;
  hasEditPermission: boolean;
  onToggleCurrency: (currency: string, enabled: boolean) => void;
}

export const CurrenciesCard: React.FC<CurrenciesCardProps> = React.memo(
  ({ config, hasEditPermission, onToggleCurrency }) => {
    // 防御性检查：确保 enabledCurrencies 存在且为数组
    const enabledCurrencies = config?.enabledCurrencies ?? [];

    return (
      <Card title="支持币种管理">
        <Alert
          message="提示"
          description="启用或禁用币种会影响用户可选择的支付货币。国际支付方式（Stripe、PayPal、Paddle）支持多币种，国内支付方式仅支持人民币。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Row gutter={[16, 16]}>
          {SUPPORTED_CURRENCIES.map((currency) => (
            <Col xs={24} sm={12} md={6} key={currency}>
              <Card size="small">
                <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                  <Space>
                    <span style={{ fontWeight: 500 }}>{getCurrencyName(currency)}</span>
                    {enabledCurrencies.includes(currency) ? (
                      <Tag color="green">已启用</Tag>
                    ) : (
                      <Tag>已禁用</Tag>
                    )}
                  </Space>
                  <Switch
                    checked={enabledCurrencies.includes(currency)}
                    onChange={(checked) => onToggleCurrency(currency, checked)}
                    disabled={!hasEditPermission}
                  />
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    );
  }
);

CurrenciesCard.displayName = 'CurrenciesCard';
