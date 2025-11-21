/**
 * 账户余额管理 React Query Hooks (用户端)
 *
 * 提供余额查询、充值、交易记录等功能
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { shouldRetry } from '../utils/errorHandler';
import { StaleTimeConfig } from '../utils/cacheConfig';
import request from '@/utils/request';

// ==================== 类型定义 ====================

export interface UserBalance {
  userId: string;
  availableBalance: number;
  frozenBalance: number;
  totalBalance: number;
  currency: string;
  lowBalanceThreshold: number;
  alertEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BalanceTransaction {
  id: string;
  userId: string;
  type: 'recharge' | 'consume' | 'freeze' | 'unfreeze' | 'adjust' | 'refund';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
}

export interface BalanceStatistics {
  userId: string;
  currentBalance: number;
  yesterdayBalance: number;
  monthStartBalance: number;
  monthConsumption: number;
  avgDailyConsumption: number;
  forecastDaysLeft: number;
  totalRecharge: number;
  totalConsume: number;
  transactionCount: number;
}

export interface TransactionListParams {
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionListResponse {
  data: BalanceTransaction[];
  total: number;
}

// ==================== Query Keys ====================

export const balanceKeys = {
  all: ['balance'] as const,
  current: (userId: string) => [...balanceKeys.all, 'current', userId] as const,
  transactions: (userId: string, params?: TransactionListParams) =>
    [...balanceKeys.all, 'transactions', userId, params] as const,
  stats: (userId: string) => [...balanceKeys.all, 'stats', userId] as const,
};

// ==================== Query Hooks ====================

/**
 * 获取用户余额
 * @param userId - 用户ID
 * @param options - 查询选项
 */
export function useUserBalance(userId: string, options?: { enabled?: boolean }) {
  return useQuery<UserBalance>({
    queryKey: balanceKeys.current(userId),
    queryFn: async () => {
      const res = await request.get(`/balance/user/${userId}`);
      return res.data;
    },
    enabled: !!userId && (options?.enabled ?? true),
    staleTime: StaleTimeConfig.SHORT, // 5秒缓存
    retry: shouldRetry,
  });
}

/**
 * 获取交易记录
 * @param userId - 用户ID
 * @param params - 查询参数
 */
export function useBalanceTransactions(userId: string, params?: TransactionListParams) {
  return useQuery<TransactionListResponse>({
    queryKey: balanceKeys.transactions(userId, params),
    queryFn: async () => {
      const res = await request.get(`/balance/transactions/${userId}`, { params });
      return res.data;
    },
    enabled: !!userId,
    staleTime: StaleTimeConfig.SHORT,
    retry: shouldRetry,
  });
}

/**
 * 获取余额统计
 * @param userId - 用户ID
 */
export function useBalanceStatistics(userId: string) {
  return useQuery<BalanceStatistics>({
    queryKey: balanceKeys.stats(userId),
    queryFn: async () => {
      const res = await request.get(`/balance/statistics/${userId}`);
      return res.data;
    },
    enabled: !!userId,
    staleTime: StaleTimeConfig.SHORT,
    retry: shouldRetry,
  });
}

// ==================== Mutation Hooks ====================

/**
 * 充值
 */
export function useRecharge() {
  const queryClient = useQueryClient();

  return useMutation<
    UserBalance,
    Error,
    { userId: string; amount: number; description?: string }
  >({
    mutationFn: async (data) => {
      const res = await request.post('/balance/recharge', data);
      return res.data;
    },
    onSuccess: (_, variables) => {
      message.success('充值成功！');
      // 刷新相关缓存
      queryClient.invalidateQueries({ queryKey: balanceKeys.current(variables.userId) });
      queryClient.invalidateQueries({ queryKey: balanceKeys.transactions(variables.userId) });
      queryClient.invalidateQueries({ queryKey: balanceKeys.stats(variables.userId) });
    },
    onError: (error) => {
      message.error(error.message || '充值失败');
    },
  });
}

// ==================== 工具函数 ====================

/**
 * 格式化余额显示
 */
export const formatBalance = (balance: number, currency: string = 'CNY'): string => {
  const currencySymbols: Record<string, string> = {
    CNY: '¥',
    USD: '$',
    EUR: '€',
    GBP: '£',
  };

  const symbol = currencySymbols[currency] || currency;
  return `${symbol}${balance.toFixed(2)}`;
};

// ==================== 别名导出 ====================

/**
 * useBalance - useUserBalance 的别名（用于简化导入）
 */
export const useBalance = useUserBalance;
