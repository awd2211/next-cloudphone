import React, { useCallback } from 'react';
import {
  Card,
  Form,
  Button,
  Space,
  Alert,
  Badge,
  Descriptions,
  FormInstance,
} from 'antd';
import { SaveOutlined, TestTubeOutlined } from '@ant-design/icons';
import { DeviceProvider } from '@/types/provider';
import { ALERT_MESSAGES } from './constants';

interface HealthData {
  provider: DeviceProvider;
  healthy: boolean;
  lastCheck?: string;
  message?: string;
}

interface ProviderConfigFormProps {
  provider: DeviceProvider;
  form: FormInstance;
  health: HealthData[];
  loading: boolean;
  testLoading: boolean;
  onSave: (values: any) => void;
  onTest: () => void;
  children: React.ReactNode;
}

const ProviderConfigForm: React.FC<ProviderConfigFormProps> = React.memo(
  ({ provider, form, health, loading, testLoading, onSave, onTest, children }) => {
    const status = health.find((h) => h.provider === provider);
    const alertConfig = ALERT_MESSAGES[provider];

    const healthStatus = status?.healthy ? (
      <Badge status="success" text="健康" />
    ) : (
      <Badge status="error" text={status?.message || '异常'} />
    );

    const handleFinish = useCallback(
      (values: any) => {
        onSave(values);
      },
      [onSave]
    );

    return (
      <Card>
        <Alert
          message={alertConfig.message}
          description={alertConfig.description}
          type="info"
          showIcon
          style={{ marginBottom: '24px' }}
        />

        <Descriptions title="健康状态" bordered column={2} style={{ marginBottom: '24px' }}>
          <Descriptions.Item label="状态">{healthStatus}</Descriptions.Item>
          <Descriptions.Item label="最后检查">{status?.lastCheck || '-'}</Descriptions.Item>
        </Descriptions>

        <Form form={form} layout="vertical" onFinish={handleFinish}>
          {children}

          <Space>
            <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
              保存配置
            </Button>
            <Button onClick={onTest} loading={testLoading} icon={<TestTubeOutlined />}>
              测试连接
            </Button>
          </Space>
        </Form>
      </Card>
    );
  }
);

ProviderConfigForm.displayName = 'ProviderConfigForm';

export default ProviderConfigForm;
