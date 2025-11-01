import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { DeviceProvider, ProviderNames, ProviderIcons } from '@/types/provider';

interface HealthData {
  provider: DeviceProvider;
  healthy: boolean;
  lastCheck?: string;
  message?: string;
}

interface ProviderHealthStatusProps {
  health: HealthData[];
}

const ProviderHealthStatus: React.FC<ProviderHealthStatusProps> = React.memo(({ health }) => {
  return (
    <Card title="提供商配置" style={{ marginBottom: '24px' }}>
      <Row gutter={16}>
        {Object.values(DeviceProvider).map((provider) => {
          const status = health.find((h) => h.provider === provider);
          return (
            <Col span={6} key={provider}>
              <Card>
                <Statistic
                  title={`${ProviderIcons[provider]} ${ProviderNames[provider]}`}
                  value={status?.healthy ? '正常' : '异常'}
                  valueStyle={{ color: status?.healthy ? '#3f8600' : '#cf1322' }}
                  prefix={status?.healthy ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                />
              </Card>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
});

ProviderHealthStatus.displayName = 'ProviderHealthStatus';

export default ProviderHealthStatus;
