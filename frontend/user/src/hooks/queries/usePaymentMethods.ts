/**
 * 支付方式管理 React Query Hooks (用户端)
 *
 * 提供支付方式列表查询和管理功能
 */

import { useQuery } from '@tanstack/react-query';
import type { PaymentMethod } from '@/services/billing';
import * as billingService from '@/services/billing';
import { StaleTimeConfig } from '../utils/cacheConfig';

// ==================== Query Keys ====================

export const paymentMethodKeys = {
  all: ['payment-methods'] as const,
  list: () => [...paymentMethodKeys.all, 'list'] as const,
};

// ==================== Query Hooks ====================

/**
 * 获取支付方式列表
 * 返回系统支持的所有支付方式及其状态
 */
export const usePaymentMethods = () => {
  return useQuery<Array<{ method: PaymentMethod; enabled: boolean; icon: string; name: string }>>({
    queryKey: paymentMethodKeys.list(),
    queryFn: () => billingService.getPaymentMethods(),
    staleTime: StaleTimeConfig.paymentMethods, // 5分钟缓存
  });
};

/**
 * 检查特定支付方式是否可用
 */
export const useIsPaymentMethodEnabled = (method: PaymentMethod) => {
  const { data } = usePaymentMethods();
  return data?.find((pm) => pm.method === method)?.enabled ?? false;
};

/**
 * 获取可用的支付方式列表
 */
export const useAvailablePaymentMethods = () => {
  const { data, ...rest } = usePaymentMethods();
  return {
    data: data?.filter((pm) => pm.enabled) ?? [],
    ...rest,
  };
};
