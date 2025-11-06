import { useState, useEffect, useCallback, useMemo } from 'react';
import { Form, message } from 'antd';
import { DeviceProvider, ProviderNames } from '@/types/provider';
import {
  getProviderConfig,
  updateProviderConfig,
  testProviderConnection,
  getProviderHealth,
} from '@/services/provider';
import { useSafeApi } from './useSafeApi';
import { ProviderHealthResponseSchema } from '@/schemas/api.schemas';

export const useProviderConfig = () => {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState<Record<string, boolean>>({});

  const [dockerForm] = Form.useForm();
  const [huaweiForm] = Form.useForm();
  const [aliyunForm] = Form.useForm();
  const [physicalForm] = Form.useForm();

  // 表单映射 (使用 useMemo 避免重复创建)
  const formMap = useMemo(
    () => ({
      [DeviceProvider.DOCKER]: dockerForm,
      [DeviceProvider.HUAWEI]: huaweiForm,
      [DeviceProvider.ALIYUN]: aliyunForm,
      [DeviceProvider.PHYSICAL]: physicalForm,
    }),
    [dockerForm, huaweiForm, aliyunForm, physicalForm]
  );

  // ✅ 使用 useSafeApi 加载健康状态
  const {
    data: healthResponse,
    execute: executeLoadHealth,
  } = useSafeApi(
    getProviderHealth,
    ProviderHealthResponseSchema,
    {
      errorMessage: '加载健康状态失败',
      fallbackValue: { data: [] },
      showError: false,
    }
  );

  const health = healthResponse?.data || [];

  // 加载配置（初始化表单，不适合 useSafeApi）
  const loadConfig = useCallback(
    async (provider: DeviceProvider) => {
      try {
        // eslint-disable-next-line local/no-unsafe-array-assignment
        const config = await getProviderConfig(provider);
        formMap[provider]?.setFieldsValue(config);
      } catch (error) {
        console.error(`加载 ${provider} 配置失败`, error);
      }
    },
    [formMap]
  );

  // 初始化加载
  useEffect(() => {
    executeLoadHealth();
    Object.values(DeviceProvider).forEach(loadConfig);
  }, [executeLoadHealth, loadConfig]);

  // 保存配置
  const handleSave = useCallback(
    async (provider: DeviceProvider, values: any) => {
      setLoading(true);
      try {
        await updateProviderConfig(provider, values);
        message.success(`${ProviderNames[provider]} 配置已保存`);
        executeLoadHealth();
      } catch (error) {
        message.error('保存配置失败');
      } finally {
        setLoading(false);
      }
    },
    [executeLoadHealth]
  );

  // 测试连接
  const handleTest = useCallback(
    async (provider: DeviceProvider) => {
      setTestLoading((prev) => ({ ...prev, [provider]: true }));
      try {
        await testProviderConnection(provider);
        message.success(`${ProviderNames[provider]} 连接测试成功`);
        executeLoadHealth();
      } catch (error: any) {
        message.error(`连接测试失败: ${error.message}`);
      } finally {
        setTestLoading((prev) => ({ ...prev, [provider]: false }));
      }
    },
    [executeLoadHealth]
  );

  return {
    loading,
    testLoading,
    health,
    forms: {
      docker: dockerForm,
      huawei: huaweiForm,
      aliyun: aliyunForm,
      physical: physicalForm,
    },
    handleSave,
    handleTest,
  };
};
