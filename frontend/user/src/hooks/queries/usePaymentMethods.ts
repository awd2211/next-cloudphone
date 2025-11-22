/**
 * 支付方式管理 React Query Hooks (用户端)
 *
 * 提供支付方式列表查询和管理功能
 * ✅ 使用 Zod Schema 验证 API 响应
 */

import type { PaymentMethod } from '@/services/billing';
import * as billingService from '@/services/billing';
import { StaleTimeConfig } from '../utils/cacheConfig';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import { z } from 'zod';

// ==================== 类型定义 ====================

/** 支付方式列表项 */
export interface PaymentMethodItem {
  method: string;
  enabled: boolean;
  icon: string;
  name: string;
}

// 支付方式列表项 Schema
const PaymentMethodItemSchema = z.object({
  method: z.string(),
  enabled: z.boolean(),
  icon: z.string(),
  name: z.string(),
});
const PaymentMethodsSchema = z.array(PaymentMethodItemSchema);

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
  return useValidatedQuery<PaymentMethodItem[]>({
    queryKey: paymentMethodKeys.list(),
    queryFn: () => billingService.getPaymentMethods(),
    schema: PaymentMethodsSchema,
    staleTime: StaleTimeConfig.paymentMethods, // 5分钟缓存
  });
};

/**
 * 检查特定支付方式是否可用
 */
export const useIsPaymentMethodEnabled = (method: PaymentMethod) => {
  const { data } = usePaymentMethods();
  return data?.find((pm: PaymentMethodItem) => pm.method === method)?.enabled ?? false;
};

/**
 * 获取可用的支付方式列表
 */
export const useAvailablePaymentMethods = () => {
  const { data, ...rest } = usePaymentMethods();
  return {
    data: data?.filter((pm: PaymentMethodItem) => pm.enabled) ?? [],
    ...rest,
  };
};
