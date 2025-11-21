import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
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

/**
 * SMS 短信管理 React Query Hooks (用户端)
 *
 * 提供用户自助短信查询、验证码查询、号码管理功能
 */

// ==================== Query Keys ====================

export const smsKeys = {
  all: ['sms'] as const,
  mySMS: (params?: any) => [...smsKeys.all, 'my', params] as const,
  stats: () => [...smsKeys.all, 'stats'] as const,

  codes: () => [...smsKeys.all, 'codes'] as const,
  myCodes: (params?: any) => [...smsKeys.codes(), 'my', params] as const,
  codeByPhone: (phone: string) => [...smsKeys.codes(), 'phone', phone] as const,

  device: (deviceId: string) => [...smsKeys.all, 'device', deviceId] as const,
  deviceSMS: (deviceId: string, params?: any) => [...smsKeys.device(deviceId), 'sms', params] as const,
  deviceLatestCode: (deviceId: string, params?: any) => [...smsKeys.device(deviceId), 'code', params] as const,

  numbers: () => [...smsKeys.all, 'numbers'] as const,
  myNumbers: (params?: any) => [...smsKeys.numbers(), 'my', params] as const,
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
    meta: { total: number; page: number; limit: number; };
  }>({
    queryKey: smsKeys.mySMS(params),
    queryFn: () => getMySMS(params),
  });
};

/**
 * 获取我的短信统计
 */
export const useMySMSStats = () => {
  return useQuery<SMSStats>({
    queryKey: smsKeys.stats(),
    queryFn: getMySMSStats,
    refetchInterval: 30000, // 每30秒自动刷新
  });
};

/**
 * 获取设备短信列表
 */
export const useDeviceSMS = (deviceId: string, params?: {
  page?: number;
  limit?: number;
  unread?: boolean;
}, options?: { enabled?: boolean }) => {
  return useQuery<{
    data: SMSRecord[];
    meta: { total: number; page: number; limit: number; };
  }>({
    queryKey: smsKeys.deviceSMS(deviceId, params),
    queryFn: () => getDeviceSMS(deviceId, params),
    enabled: options?.enabled !== false && !!deviceId,
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
    meta: { total: number; page: number; limit: number; };
  }>({
    queryKey: smsKeys.myCodes(params),
    queryFn: () => getMyVerificationCodes(params),
  });
};

/**
 * 根据手机号查询验证码
 */
export const useVerificationCodeByPhone = (phone: string, options?: { enabled?: boolean }) => {
  return useQuery<VerificationCode[]>({
    queryKey: smsKeys.codeByPhone(phone),
    queryFn: () => getVerificationCodeByPhone(phone),
    enabled: options?.enabled !== false && !!phone,
  });
};

/**
 * 获取设备的最新验证码
 */
export const useDeviceLatestCode = (deviceId: string, params?: {
  codeType?: string;
}, options?: { enabled?: boolean }) => {
  return useQuery<VerificationCode>({
    queryKey: smsKeys.deviceLatestCode(deviceId, params),
    queryFn: () => getDeviceLatestCode(deviceId, params),
    enabled: options?.enabled !== false && !!deviceId,
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
    meta: { total: number; page: number; limit: number; };
  }>({
    queryKey: smsKeys.myNumbers(params),
    queryFn: () => getMyNumbers(params),
  });
};

/**
 * 获取我的号码统计
 */
export const useMyNumberStats = () => {
  return useQuery<NumberStats>({
    queryKey: smsKeys.numberStats(),
    queryFn: getMyNumberStats,
    refetchInterval: 30000,
  });
};

/**
 * 获取号码 (申请新号码)
 */
export const useAcquireNumber = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: acquireNumber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.myNumbers() });
      queryClient.invalidateQueries({ queryKey: smsKeys.numberStats() });
      message.success('号码获取成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '号码获取失败');
    },
  });
};

/**
 * 释放号码
 */
export const useReleaseNumber = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: releaseNumber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.myNumbers() });
      queryClient.invalidateQueries({ queryKey: smsKeys.numberStats() });
      message.success('号码释放成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '号码释放失败');
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
      renewNumber(numberId, duration),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.myNumbers() });
      message.success('号码续期成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '号码续期失败');
    },
  });
};

// ==================== 消息操作 ====================

/**
 * 标记短信为已读
 */
export const useMarkSMSAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markSMSAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.all });
      queryClient.invalidateQueries({ queryKey: smsKeys.stats() });
    },
    onError: (error: any) => {
      message.error(error?.message || '操作失败');
    },
  });
};

/**
 * 批量标记为已读
 */
export const useBatchMarkAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchMarkAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.all });
      queryClient.invalidateQueries({ queryKey: smsKeys.stats() });
      message.success('批量标记成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '操作失败');
    },
  });
};
