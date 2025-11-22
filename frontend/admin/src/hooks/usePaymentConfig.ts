import { useState, useCallback } from 'react';
import { message } from 'antd';
import {
  getPaymentConfig,
  updatePaymentConfig,
  testProviderConnection,
} from '@/services/payment-admin';
import { useValidatedQuery } from '@/hooks/utils';
import { PaymentConfigSchema } from '@/schemas/api.schemas';

export const usePaymentConfig = () => {
  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  // ✅ 使用 useValidatedQuery 加载配置
  const {
    data: config,
    isLoading: loading,
    refetch,
  } = useValidatedQuery({
    queryKey: ['payment-config'],
    queryFn: getPaymentConfig,
    schema: PaymentConfigSchema,
    apiErrorMessage: '加载配置失败',
    fallbackValue: null,
    staleTime: 60 * 1000, // 配置数据1分钟缓存
  });

  // Wrap refetch for onClick handler
  const loadConfig = useCallback(() => {
    refetch();
  }, [refetch]);

  // 切换支付方式
  const handleToggleMethod = useCallback(
    async (method: string, enabled: boolean) => {
      if (!config) return;

      // 防御性检查：确保 enabledMethods 为数组
      const currentMethods = Array.isArray(config.enabledMethods) ? config.enabledMethods : [];
      const newEnabledMethods = enabled
        ? [...currentMethods, method]
        : currentMethods.filter((m) => m !== method);

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

      // 防御性检查：确保 enabledCurrencies 为数组
      const currentCurrencies = Array.isArray(config.enabledCurrencies) ? config.enabledCurrencies : [];
      const newEnabledCurrencies = enabled
        ? [...currentCurrencies, currency]
        : currentCurrencies.filter((c) => c !== currency);

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
