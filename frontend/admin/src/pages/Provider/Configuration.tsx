import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Tabs, Form } from 'antd';
import { DeviceProvider, ProviderNames, ProviderIcons } from '@/types/provider';
import {
  ProviderHealthStatus,
  ProviderConfigForm,
  DockerFormFields,
  HuaweiFormFields,
  AliyunFormFields,
  AwsFormFields,
  TencentFormFields,
  BaiduFormFields,
  BrowserStackFormFields,
  GenymotionFormFields,
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
  const [awsForm] = Form.useForm();
  const [tencentForm] = Form.useForm();
  const [baiduForm] = Form.useForm();
  const [browserStackForm] = Form.useForm();
  const [genymotionForm] = Form.useForm();

  const forms = useMemo(
    () => ({
      docker: dockerForm,
      huawei: huaweiForm,
      aliyun: aliyunForm,
      aws: awsForm,
      tencent: tencentForm,
      baidu: baiduForm,
      browserstack: browserStackForm,
      genymotion: genymotionForm,
    }),
    [dockerForm, huaweiForm, aliyunForm, awsForm, tencentForm, baiduForm, browserStackForm, genymotionForm]
  );

  // ✅ 测试加载状态（UI层）
  const [testLoading, setTestLoading] = useState<Record<string, boolean>>({});

  // ✅ 数据获取（React Query）
  const { data: health = [] } = useProviderHealth();

  // 获取所有云手机提供商配置
  const { data: dockerConfig } = useProviderConfig(DeviceProvider.DOCKER);
  const { data: huaweiConfig } = useProviderConfig(DeviceProvider.HUAWEI);
  const { data: aliyunConfig } = useProviderConfig(DeviceProvider.ALIYUN);
  const { data: awsConfig } = useProviderConfig(DeviceProvider.AWS);
  const { data: tencentConfig } = useProviderConfig(DeviceProvider.TENCENT);
  const { data: baiduConfig } = useProviderConfig(DeviceProvider.BAIDU);
  const { data: browserStackConfig } = useProviderConfig(DeviceProvider.BROWSERSTACK);
  const { data: genymotionConfig } = useProviderConfig(DeviceProvider.GENYMOTION);

  // ✅ 当配置数据加载完成后，填充表单
  useEffect(() => {
    if (dockerConfig?.config) {
      dockerForm.setFieldsValue(dockerConfig.config);
    }
  }, [dockerConfig, dockerForm]);

  useEffect(() => {
    if (huaweiConfig?.config) {
      huaweiForm.setFieldsValue(huaweiConfig.config);
    }
  }, [huaweiConfig, huaweiForm]);

  useEffect(() => {
    if (aliyunConfig?.config) {
      // 映射后端字段名到前端表单字段名（只保留必要字段）
      const formValues = {
        accessKeyId: aliyunConfig.config.accessKeyId,
        accessKeySecret: aliyunConfig.config.accessKeySecret,
        regionId: aliyunConfig.config.regionId || aliyunConfig.config.region,
        endpoint: aliyunConfig.config.endpoint || aliyunConfig.config.apiEndpoint?.replace('https://', ''),
      };
      aliyunForm.setFieldsValue(formValues);
    }
  }, [aliyunConfig, aliyunForm]);

  useEffect(() => {
    if (awsConfig?.config) {
      awsForm.setFieldsValue(awsConfig.config);
    }
  }, [awsConfig, awsForm]);

  useEffect(() => {
    if (tencentConfig?.config) {
      tencentForm.setFieldsValue(tencentConfig.config);
    }
  }, [tencentConfig, tencentForm]);

  useEffect(() => {
    if (baiduConfig?.config) {
      baiduForm.setFieldsValue(baiduConfig.config);
    }
  }, [baiduConfig, baiduForm]);

  useEffect(() => {
    if (browserStackConfig?.config) {
      browserStackForm.setFieldsValue(browserStackConfig.config);
    }
  }, [browserStackConfig, browserStackForm]);

  useEffect(() => {
    if (genymotionConfig?.config) {
      genymotionForm.setFieldsValue(genymotionConfig.config);
    }
  }, [genymotionConfig, genymotionForm]);

  // ✅ Mutations
  const updateConfigMutation = useUpdateProviderConfig();
  const testConnectionMutation = useTestProviderConnection();

  // ✅ 保存配置（带字段映射）
  const handleSave = useCallback(
    async (provider: DeviceProvider, values: any) => {
      let configToSave = values;

      // 阿里云需要字段映射：前端字段名 -> 后端字段名
      if (provider === DeviceProvider.ALIYUN) {
        configToSave = {
          accessKeyId: values.accessKeyId,
          accessKeySecret: values.accessKeySecret,
          region: values.regionId,
          regionId: values.regionId,
          apiEndpoint: values.endpoint ? `https://${values.endpoint.replace('https://', '')}` : undefined,
          endpoint: values.endpoint?.replace('https://', ''),
        };
      }

      // 后端 API 期望格式: { enabled?, priority?, maxDevices?, config?: Record<string, any> }
      await updateConfigMutation.mutateAsync({ provider, config: { config: configToSave } });
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

  // AWS Device Farm 配置
  const renderAwsConfig = useCallback(
    () => (
      <ProviderConfigForm
        provider={DeviceProvider.AWS}
        form={forms.aws}
        health={health as any}
        loading={loading}
        testLoading={testLoading[DeviceProvider.AWS] || false}
        onSave={(values) => handleSave(DeviceProvider.AWS, values)}
        onTest={() => handleTest(DeviceProvider.AWS)}
      >
        <AwsFormFields />
      </ProviderConfigForm>
    ),
    [forms.aws, health, loading, testLoading, handleSave, handleTest]
  );

  // 腾讯云配置
  const renderTencentConfig = useCallback(
    () => (
      <ProviderConfigForm
        provider={DeviceProvider.TENCENT}
        form={forms.tencent}
        health={health as any}
        loading={loading}
        testLoading={testLoading[DeviceProvider.TENCENT] || false}
        onSave={(values) => handleSave(DeviceProvider.TENCENT, values)}
        onTest={() => handleTest(DeviceProvider.TENCENT)}
      >
        <TencentFormFields />
      </ProviderConfigForm>
    ),
    [forms.tencent, health, loading, testLoading, handleSave, handleTest]
  );

  // 百度云配置
  const renderBaiduConfig = useCallback(
    () => (
      <ProviderConfigForm
        provider={DeviceProvider.BAIDU}
        form={forms.baidu}
        health={health as any}
        loading={loading}
        testLoading={testLoading[DeviceProvider.BAIDU] || false}
        onSave={(values) => handleSave(DeviceProvider.BAIDU, values)}
        onTest={() => handleTest(DeviceProvider.BAIDU)}
      >
        <BaiduFormFields />
      </ProviderConfigForm>
    ),
    [forms.baidu, health, loading, testLoading, handleSave, handleTest]
  );

  // BrowserStack 配置
  const renderBrowserStackConfig = useCallback(
    () => (
      <ProviderConfigForm
        provider={DeviceProvider.BROWSERSTACK}
        form={forms.browserstack}
        health={health as any}
        loading={loading}
        testLoading={testLoading[DeviceProvider.BROWSERSTACK] || false}
        onSave={(values) => handleSave(DeviceProvider.BROWSERSTACK, values)}
        onTest={() => handleTest(DeviceProvider.BROWSERSTACK)}
      >
        <BrowserStackFormFields />
      </ProviderConfigForm>
    ),
    [forms.browserstack, health, loading, testLoading, handleSave, handleTest]
  );

  // Genymotion 配置
  const renderGenymotionConfig = useCallback(
    () => (
      <ProviderConfigForm
        provider={DeviceProvider.GENYMOTION}
        form={forms.genymotion}
        health={health as any}
        loading={loading}
        testLoading={testLoading[DeviceProvider.GENYMOTION] || false}
        onSave={(values) => handleSave(DeviceProvider.GENYMOTION, values)}
        onTest={() => handleTest(DeviceProvider.GENYMOTION)}
      >
        <GenymotionFormFields />
      </ProviderConfigForm>
    ),
    [forms.genymotion, health, loading, testLoading, handleSave, handleTest]
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
          {
            key: 'aws',
            label: `${ProviderIcons[DeviceProvider.AWS]} ${ProviderNames[DeviceProvider.AWS]}`,
            children: renderAwsConfig(),
          },
          {
            key: 'tencent',
            label: `${ProviderIcons[DeviceProvider.TENCENT]} ${ProviderNames[DeviceProvider.TENCENT]}`,
            children: renderTencentConfig(),
          },
          {
            key: 'baidu',
            label: `${ProviderIcons[DeviceProvider.BAIDU]} ${ProviderNames[DeviceProvider.BAIDU]}`,
            children: renderBaiduConfig(),
          },
          {
            key: 'browserstack',
            label: `${ProviderIcons[DeviceProvider.BROWSERSTACK]} ${ProviderNames[DeviceProvider.BROWSERSTACK]}`,
            children: renderBrowserStackConfig(),
          },
          {
            key: 'genymotion',
            label: `${ProviderIcons[DeviceProvider.GENYMOTION]} ${ProviderNames[DeviceProvider.GENYMOTION]}`,
            children: renderGenymotionConfig(),
          },
        ]}
      />
    </div>
  );
};

export default ProviderConfiguration;
