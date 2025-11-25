import React, { useCallback, useMemo, useState } from 'react';
import { Tabs, Form } from 'antd';
import { DeviceProvider, ProviderNames, ProviderIcons } from '@/types/provider';
import {
  ProviderHealthStatus,
  ProviderConfigForm,
  DockerFormFields,
  HuaweiFormFields,
  AliyunFormFields,
} from '@/components/Provider';
import {
  useProviderHealth,
  useProviderConfig,
  useUpdateProviderConfig,
  useTestProviderConnection,
} from '@/hooks/queries/useProviders';

const ProviderConfiguration: React.FC = () => {
  // ✅ 表单管理（UI层 - 留在组件）
  const [dockerForm] = Form.useForm();
  const [huaweiForm] = Form.useForm();
  const [aliyunForm] = Form.useForm();

  const forms = useMemo(
    () => ({
      docker: dockerForm,
      huawei: huaweiForm,
      aliyun: aliyunForm,
    }),
    [dockerForm, huaweiForm, aliyunForm]
  );

  // ✅ 测试加载状态（UI层）
  const [testLoading, setTestLoading] = useState<Record<string, boolean>>({});

  // ✅ 数据获取（React Query）
  const { data: health = [] } = useProviderHealth();

  // 预加载所有云手机提供商配置（物理设备在设备中心单独管理）
  useProviderConfig(DeviceProvider.DOCKER);
  useProviderConfig(DeviceProvider.HUAWEI);
  useProviderConfig(DeviceProvider.ALIYUN);

  // ✅ Mutations
  const updateConfigMutation = useUpdateProviderConfig();
  const testConnectionMutation = useTestProviderConnection();

  // ✅ 保存配置
  const handleSave = useCallback(
    async (provider: DeviceProvider, values: any) => {
      await updateConfigMutation.mutateAsync({ provider, config: values });
    },
    [updateConfigMutation]
  );

  // ✅ 测试连接
  const handleTest = useCallback(
    async (provider: DeviceProvider) => {
      setTestLoading((prev) => ({ ...prev, [provider]: true }));
      try {
        await testConnectionMutation.mutateAsync(provider);
      } finally {
        setTestLoading((prev) => ({ ...prev, [provider]: false }));
      }
    },
    [testConnectionMutation]
  );

  const loading = updateConfigMutation.isPending;

  // Docker 配置
  const renderDockerConfig = useCallback(
    () => (
      <ProviderConfigForm
        provider={DeviceProvider.DOCKER}
        form={forms.docker}
        health={health as any}
        loading={loading}
        testLoading={testLoading[DeviceProvider.DOCKER] || false}
        onSave={(values) => handleSave(DeviceProvider.DOCKER, values)}
        onTest={() => handleTest(DeviceProvider.DOCKER)}
      >
        <DockerFormFields />
      </ProviderConfigForm>
    ),
    [forms.docker, health, loading, testLoading, handleSave, handleTest]
  );

  // 华为云配置
  const renderHuaweiConfig = useCallback(
    () => (
      <ProviderConfigForm
        provider={DeviceProvider.HUAWEI}
        form={forms.huawei}
        health={health as any}
        loading={loading}
        testLoading={testLoading[DeviceProvider.HUAWEI] || false}
        onSave={(values) => handleSave(DeviceProvider.HUAWEI, values)}
        onTest={() => handleTest(DeviceProvider.HUAWEI)}
      >
        <HuaweiFormFields />
      </ProviderConfigForm>
    ),
    [forms.huawei, health, loading, testLoading, handleSave, handleTest]
  );

  // 阿里云配置
  const renderAliyunConfig = useCallback(
    () => (
      <ProviderConfigForm
        provider={DeviceProvider.ALIYUN}
        form={forms.aliyun}
        health={health as any}
        loading={loading}
        testLoading={testLoading[DeviceProvider.ALIYUN] || false}
        onSave={(values) => handleSave(DeviceProvider.ALIYUN, values)}
        onTest={() => handleTest(DeviceProvider.ALIYUN)}
      >
        <AliyunFormFields />
      </ProviderConfigForm>
    ),
    [forms.aliyun, health, loading, testLoading, handleSave, handleTest]
  );

  return (
    <div style={{ padding: '24px' }}>
      <ProviderHealthStatus health={health as any} />

      <Tabs
        defaultActiveKey="docker"
        items={[
          {
            key: 'docker',
            label: `${ProviderIcons[DeviceProvider.DOCKER]} ${ProviderNames[DeviceProvider.DOCKER]}`,
            children: renderDockerConfig(),
          },
          {
            key: 'huawei',
            label: `${ProviderIcons[DeviceProvider.HUAWEI]} ${ProviderNames[DeviceProvider.HUAWEI]}`,
            children: renderHuaweiConfig(),
          },
          {
            key: 'aliyun',
            label: `${ProviderIcons[DeviceProvider.ALIYUN]} ${ProviderNames[DeviceProvider.ALIYUN]}`,
            children: renderAliyunConfig(),
          },
        ]}
      />
    </div>
  );
};

export default ProviderConfiguration;
