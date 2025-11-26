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
import { SaveOutlined, ExperimentOutlined } from '@ant-design/icons';
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
    // 确保 health 是数组
    const healthArray = Array.isArray(health) ? health : [];
    const status = healthArray.find((h) => h.provider === provider);
    // 防御性检查：确保 alertConfig 存在
    const alertConfig = ALERT_MESSAGES[provider] || {
      message: '提供商配置',
      description: '配置云手机提供商 API 凭证和参数',
    };

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
            <Button onClick={onTest} loading={testLoading} icon={<ExperimentOutlined />}>
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
