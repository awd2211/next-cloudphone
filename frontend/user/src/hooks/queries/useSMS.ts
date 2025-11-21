/**
 * SMS 短信管理 React Query Hooks (用户端)
 *
 * 提供用户自助短信查询、验证码查询、号码管理功能
 *
 * ✅ 统一使用 const 箭头函数风格
 * ✅ 使用类型化的错误处理
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMySMS,
  getMySMSStats,
  getMyVerificationCodes,
  getVerificationCodeByPhone,
  getDeviceSMS,
  getDeviceLatestCode,
  acquireNumber,
  releaseNumber,
  renewNumber,
  getMyNumbers,
  getMyNumberStats,
  markSMSAsRead,
  batchMarkAsRead,
  type SMSRecord,
  type SMSStats,
  type VerificationCode,
  type PhoneNumber,
  type NumberStats,
} from '@/services/sms';
import {
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig, RefetchIntervalConfig } from '../utils/cacheConfig';

// ==================== Query Keys ====================

export const smsKeys = {
  all: ['sms'] as const,
  mySMS: (params?: Record<string, unknown>) => [...smsKeys.all, 'my', params] as const,
  stats: () => [...smsKeys.all, 'stats'] as const,

  codes: () => [...smsKeys.all, 'codes'] as const,
  myCodes: (params?: Record<string, unknown>) => [...smsKeys.codes(), 'my', params] as const,
  codeByPhone: (phone: string) => [...smsKeys.codes(), 'phone', phone] as const,

  device: (deviceId: string) => [...smsKeys.all, 'device', deviceId] as const,
  deviceSMS: (deviceId: string, params?: Record<string, unknown>) => [...smsKeys.device(deviceId), 'sms', params] as const,
  deviceLatestCode: (deviceId: string, params?: Record<string, unknown>) => [...smsKeys.device(deviceId), 'code', params] as const,

  numbers: () => [...smsKeys.all, 'numbers'] as const,
  myNumbers: (params?: Record<string, unknown>) => [...smsKeys.numbers(), 'my', params] as const,
  numberStats: () => [...smsKeys.numbers(), 'stats'] as const,
};

// ==================== SMS 消息查询 ====================

/**
 * 获取我的短信列表
 */
export const useMySMS = (params?: {
  page?: number;
  limit?: number;
  deviceId?: string;
  phoneNumber?: string;
  keyword?: string;
  startDate?: string;
  endDate?: string;
  unread?: boolean;
}) => {
  return useQuery<{
    data: SMSRecord[];
    meta: { total: number; page: number; limit: number };
  }>({
    queryKey: smsKeys.mySMS(params),
    queryFn: () => getMySMS(params),
    staleTime: StaleTimeConfig.sms,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * 获取我的短信统计
 */
export const useMySMSStats = () => {
  return useQuery<SMSStats>({
    queryKey: smsKeys.stats(),
    queryFn: getMySMSStats,
    staleTime: StaleTimeConfig.sms,
    refetchInterval: RefetchIntervalConfig.normal,
  });
};

/**
 * 获取设备短信列表
 */
export const useDeviceSMS = (
  deviceId: string,
  params?: {
    page?: number;
    limit?: number;
    unread?: boolean;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: smsKeys.deviceSMS(deviceId, params),
    queryFn: () => getDeviceSMS(deviceId, params),
    enabled: options?.enabled !== false && !!deviceId,
    staleTime: StaleTimeConfig.sms,
  });
};

// ==================== 验证码查询 ====================

/**
 * 获取我的验证码列表
 */
export const useMyVerificationCodes = (params?: {
  page?: number;
  limit?: number;
  codeType?: string;
  phone?: string;
  unused?: boolean;
}) => {
  return useQuery<{
    data: VerificationCode[];
    meta: { total: number; page: number; limit: number };
  }>({
    queryKey: smsKeys.myCodes(params),
    queryFn: () => getMyVerificationCodes(params),
    staleTime: StaleTimeConfig.sms,
  });
};

/**
 * 检查手机号是否有活跃验证码
 * 注意: 后端返回格式已更改为 OTP 活跃状态检查
 */
export const useVerificationCodeByPhone = (phone: string, options?: { enabled?: boolean }) => {
  return useQuery<{
    phoneNumber: string;
    type: string;
    hasActive: boolean;
    remainingSeconds: number;
  }>({
    queryKey: smsKeys.codeByPhone(phone),
    queryFn: () => getVerificationCodeByPhone(phone),
    enabled: options?.enabled !== false && !!phone,
    staleTime: StaleTimeConfig.sms,
  });
};

/**
 * 获取设备的最新验证码
 * 注意: 后端暂未实现此功能，返回 null
 */
export const useDeviceLatestCode = (
  deviceId: string,
  params?: {
    codeType?: string;
  },
  options?: { enabled?: boolean }
) => {
  return useQuery<VerificationCode | null>({
    queryKey: smsKeys.deviceLatestCode(deviceId, params),
    queryFn: () => getDeviceLatestCode(deviceId, params),
    enabled: options?.enabled !== false && !!deviceId,
    staleTime: StaleTimeConfig.sms,
  });
};

// ==================== 号码管理 ====================

/**
 * 获取我的号码列表
 */
export const useMyNumbers = (params?: {
  page?: number;
  limit?: number;
  status?: string;
  country?: string;
}) => {
  return useQuery<{
    data: PhoneNumber[];
    meta: { total: number; page: number; limit: number };
  }>({
    queryKey: smsKeys.myNumbers(params),
    queryFn: () => getMyNumbers(params),
    staleTime: StaleTimeConfig.sms,
  });
};

/**
 * 获取我的号码统计
 */
export const useMyNumberStats = () => {
  return useQuery<NumberStats>({
    queryKey: smsKeys.numberStats(),
    queryFn: getMyNumberStats,
    staleTime: StaleTimeConfig.sms,
    refetchInterval: RefetchIntervalConfig.normal,
  });
};

/**
 * 获取号码 (申请新号码)
 */
export const useAcquireNumber = () => {
  const queryClient = useQueryClient();

  return useMutation<PhoneNumber, Error, Parameters<typeof acquireNumber>[0]>({
    mutationFn: acquireNumber,
    onSuccess: () => {
      handleMutationSuccess('号码获取成功');
      queryClient.invalidateQueries({ queryKey: smsKeys.myNumbers() });
      queryClient.invalidateQueries({ queryKey: smsKeys.numberStats() });
    },
    onError: (error) => {
      handleMutationError(error, '号码获取失败');
    },
  });
};

/**
 * 释放号码
 */
export const useReleaseNumber = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: releaseNumber,
    onSuccess: () => {
      handleMutationSuccess('号码释放成功');
      queryClient.invalidateQueries({ queryKey: smsKeys.myNumbers() });
      queryClient.invalidateQueries({ queryKey: smsKeys.numberStats() });
    },
    onError: (error) => {
      handleMutationError(error, '号码释放失败');
    },
  });
};

/**
 * 续期号码
 */
export const useRenewNumber = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ numberId, duration }: { numberId: string; duration?: number }) =>
      renewNumber(numberId, duration ?? 30),
    onSuccess: () => {
      handleMutationSuccess('号码续期成功');
      queryClient.invalidateQueries({ queryKey: smsKeys.myNumbers() });
    },
    onError: (error: Error) => {
      handleMutationError(error, '号码续期失败');
    },
  });
};

// ==================== 消息操作 ====================

/**
 * 标记短信为已读
 */
export const useMarkSMSAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: markSMSAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.all });
      queryClient.invalidateQueries({ queryKey: smsKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '操作失败');
    },
  });
};

/**
 * 批量标记为已读
 */
export const useBatchMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string[]>({
    mutationFn: batchMarkAsRead,
    onSuccess: () => {
      handleMutationSuccess('批量标记成功');
      queryClient.invalidateQueries({ queryKey: smsKeys.all });
      queryClient.invalidateQueries({ queryKey: smsKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '操作失败');
    },
  });
};
