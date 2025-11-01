import { useState, useEffect, useCallback } from 'react';
import { Form, message } from 'antd';
import { DeviceProvider, ProviderNames } from '@/types/provider';
import {
  getProviderConfig,
  updateProviderConfig,
  testProviderConnection,
  getProviderHealth,
} from '@/services/provider';

interface HealthData {
  provider: DeviceProvider;
  healthy: boolean;
  lastCheck?: string;
  message?: string;
}

export const useProviderConfig = () => {
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState<Record<string, boolean>>({});
  const [health, setHealth] = useState<HealthData[]>([]);

  const [dockerForm] = Form.useForm();
  const [huaweiForm] = Form.useForm();
  const [aliyunForm] = Form.useForm();
  const [physicalForm] = Form.useForm();

  // 表单映射
  const formMap = {
    [DeviceProvider.DOCKER]: dockerForm,
    [DeviceProvider.HUAWEI]: huaweiForm,
    [DeviceProvider.ALIYUN]: aliyunForm,
    [DeviceProvider.PHYSICAL]: physicalForm,
  };

  // 加载健康状态
  const loadHealth = useCallback(async () => {
    try {
      const res = await getProviderHealth();
      setHealth(res.data);
    } catch (error) {
      console.error('加载健康状态失败', error);
    }
  }, []);

  // 加载配置
  const loadConfig = useCallback(
    async (provider: DeviceProvider) => {
      try {
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
    loadHealth();
    Object.values(DeviceProvider).forEach(loadConfig);
  }, [loadHealth, loadConfig]);

  // 保存配置
  const handleSave = useCallback(
    async (provider: DeviceProvider, values: any) => {
      setLoading(true);
      try {
        await updateProviderConfig(provider, values);
        message.success(`${ProviderNames[provider]} 配置已保存`);
        loadHealth();
      } catch (error) {
        message.error('保存配置失败');
      } finally {
        setLoading(false);
      }
    },
    [loadHealth]
  );

  // 测试连接
  const handleTest = useCallback(
    async (provider: DeviceProvider) => {
      setTestLoading((prev) => ({ ...prev, [provider]: true }));
      try {
        await testProviderConnection(provider);
        message.success(`${ProviderNames[provider]} 连接测试成功`);
        loadHealth();
      } catch (error: any) {
        message.error(`连接测试失败: ${error.message}`);
      } finally {
        setTestLoading((prev) => ({ ...prev, [provider]: false }));
      }
    },
    [loadHealth]
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
