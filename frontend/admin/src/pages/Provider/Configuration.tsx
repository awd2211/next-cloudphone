import React, { useCallback } from 'react';
import { Tabs } from 'antd';
import { DeviceProvider, ProviderNames, ProviderIcons } from '@/types/provider';
import {
  ProviderHealthStatus,
  ProviderConfigForm,
  DockerFormFields,
  HuaweiFormFields,
  AliyunFormFields,
  PhysicalFormFields,
} from '@/components/Provider';
import { useProviderConfig } from '@/hooks/useProviderConfig';

const ProviderConfiguration: React.FC = () => {
  const { loading, testLoading, health, forms, handleSave, handleTest } = useProviderConfig();

  // Docker 配置
  const renderDockerConfig = useCallback(
    () => (
      <ProviderConfigForm
        provider={DeviceProvider.DOCKER}
        form={forms.docker}
        health={health}
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
        health={health}
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
        health={health}
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

  // 物理设备配置
  const renderPhysicalConfig = useCallback(
    () => (
      <ProviderConfigForm
        provider={DeviceProvider.PHYSICAL}
        form={forms.physical}
        health={health}
        loading={loading}
        testLoading={testLoading[DeviceProvider.PHYSICAL] || false}
        onSave={(values) => handleSave(DeviceProvider.PHYSICAL, values)}
        onTest={() => handleTest(DeviceProvider.PHYSICAL)}
      >
        <PhysicalFormFields />
      </ProviderConfigForm>
    ),
    [forms.physical, health, loading, testLoading, handleSave, handleTest]
  );

  return (
    <div style={{ padding: '24px' }}>
      <ProviderHealthStatus health={health} />

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
          {
            key: 'physical',
            label: `${ProviderIcons[DeviceProvider.PHYSICAL]} ${ProviderNames[DeviceProvider.PHYSICAL]}`,
            children: renderPhysicalConfig(),
          },
        ]}
      />
    </div>
  );
};

export default ProviderConfiguration;
