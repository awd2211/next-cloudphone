import React from 'react';
import { Card, Row, Col, Badge, Descriptions, Tag, Button, Divider } from 'antd';
import { SEMANTIC } from '@/theme';
import { CheckCircleOutlined, CloseCircleOutlined, ApiOutlined } from '@ant-design/icons';
import type { PaymentConfig } from '@/services/payment-admin';
import { getProviderName } from './constants';

interface PaymentProviderCardsProps {
  config: PaymentConfig;
  testingProvider: string | null;
  hasEditPermission: boolean;
  onTestConnection: (provider: string) => void;
}

export const PaymentProviderCards: React.FC<PaymentProviderCardsProps> = React.memo(
  ({ config, testingProvider, hasEditPermission, onTestConnection }) => {
    return (
      <Card
        title={
          <>
            <ApiOutlined /> 支付提供商状态
          </>
        }
      >
        <Row gutter={[16, 16]}>
          {config.providers && Object.entries(config.providers).map(([provider, providerConfig]) => (
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
                      <span style={{ color: SEMANTIC.error.main, fontSize: '12px' }}>
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
                  onClick={() => onTestConnection(provider)}
                  disabled={!hasEditPermission}
                >
                  测试连接
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>
    );
  }
);

PaymentProviderCards.displayName = 'PaymentProviderCards';
