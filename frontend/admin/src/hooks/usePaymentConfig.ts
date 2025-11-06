import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import {
  getPaymentConfig,
  updatePaymentConfig,
  testProviderConnection,
} from '@/services/payment-admin';
import { useSafeApi } from './useSafeApi';
import { PaymentConfigSchema } from '@/schemas/api.schemas';

export const usePaymentConfig = () => {
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // ✅ 使用 useSafeApi 加载配置
  const {
    data: config,
    loading,
    execute: executeLoadConfig,
  } = useSafeApi(getPaymentConfig, PaymentConfigSchema, {
    errorMessage: '加载配置失败',
    fallbackValue: null,
  });

  // 加载配置的包装函数
  const loadConfig = useCallback(async () => {
    await executeLoadConfig();
  }, [executeLoadConfig]);

  // 初始加载
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // 切换支付方式
  const handleToggleMethod = useCallback(
    async (method: string, enabled: boolean) => {
      if (!config) return;

      const newEnabledMethods = enabled
        ? [...config.enabledMethods, method]
        : config.enabledMethods.filter((m) => m !== method);

      try {
        await updatePaymentConfig({ enabledMethods: newEnabledMethods });
        message.success(`${enabled ? '启用' : '禁用'}成功`);
        loadConfig();
      } catch (error) {
        message.error('更新配置失败');
      }
    },
    [config, loadConfig]
  );

  // 切换币种
  const handleToggleCurrency = useCallback(
    async (currency: string, enabled: boolean) => {
      if (!config) return;

      const newEnabledCurrencies = enabled
        ? [...config.enabledCurrencies, currency]
        : config.enabledCurrencies.filter((c) => c !== currency);

      try {
        await updatePaymentConfig({ enabledCurrencies: newEnabledCurrencies });
        message.success(`${enabled ? '启用' : '禁用'}成功`);
        loadConfig();
      } catch (error) {
        message.error('更新配置失败');
      }
    },
    [config, loadConfig]
  );

  // 测试连接
  const handleTestConnection = useCallback(
    async (provider: string) => {
      setTestingProvider(provider);
      try {
        await testProviderConnection(provider);
        message.success(`${provider} 连接测试成功`);
        loadConfig();
      } catch (error) {
        message.error(`${provider} 连接测试失败`);
      } finally {
        setTestingProvider(null);
      }
    },
    [loadConfig]
  );

  return {
    loading,
    config,
    testingProvider,
    loadConfig,
    handleToggleMethod,
    handleToggleCurrency,
    handleTestConnection,
  };
};
