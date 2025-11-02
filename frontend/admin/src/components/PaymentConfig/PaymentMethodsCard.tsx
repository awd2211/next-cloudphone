import React from 'react';
import { Card, Row, Col, Switch, Space, Tag, Alert } from 'antd';
import { DollarOutlined } from '@ant-design/icons';
import type { PaymentConfig } from '@/services/payment-admin';
import { PAYMENT_METHODS, getMethodName } from './constants';

interface PaymentMethodsCardProps {
  config: PaymentConfig;
  hasEditPermission: boolean;
  onToggleMethod: (method: string, enabled: boolean) => void;
}

export const PaymentMethodsCard: React.FC<PaymentMethodsCardProps> = React.memo(
  ({ config, hasEditPermission, onToggleMethod }) => {
    return (
      <Card
        title={
          <>
            <DollarOutlined /> 支付方式管理
          </>
        }
      >
        <Alert
          message="提示"
          description="启用或禁用支付方式会立即生效，用户将只能看到已启用的支付方式。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Row gutter={[16, 16]}>
          {PAYMENT_METHODS.map((method) => (
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
                    onChange={(checked) => onToggleMethod(method, checked)}
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

PaymentMethodsCard.displayName = 'PaymentMethodsCard';
