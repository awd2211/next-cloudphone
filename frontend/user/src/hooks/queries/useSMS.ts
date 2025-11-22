/**
 * SMS 短信管理 React Query Hooks (用户端)
 *
 * 提供用户自助短信查询、验证码查询、号码管理功能
 *
 * ✅ 统一使用 const 箭头函数风格
 * ✅ 使用类型化的错误处理
 * ✅ 使用 Zod Schema 验证 API 响应
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
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
} from '@/services/sms';
import type {
  SMSRecord as ServiceSMSRecord,
  SMSStats as ServiceSMSStats,
  VerificationCode as ServiceVerificationCode,
  SMSNumber as ServicePhoneNumber,
} from '@/services/sms';

// 重新导出 service 类型供 pages 使用
export type SMSRecord = ServiceSMSRecord;
export type SMSStats = ServiceSMSStats;
export type VerificationCode = ServiceVerificationCode;
export type PhoneNumber = ServicePhoneNumber;
import {
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig, RefetchIntervalConfig } from '../utils/cacheConfig';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import { SMSSchema } from '@/schemas/api.schemas';
import { z } from 'zod';

// SMS 记录 Schema
const SMSRecordSchema = SMSSchema;

// SMS 列表响应 Schema
const SMSListResponseSchema = z.object({
  data: z.array(SMSRecordSchema),
  meta: z.object({
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
  }),
});

// SMS 统计 Schema
const SMSStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  unread: z.number().int().nonnegative(),
  today: z.number().int().nonnegative().optional(),
}).passthrough();

// 验证码 Schema
const VerificationCodeSchema = z.object({
  id: z.string(),
  code: z.string(),
  type: z.string().optional(),
  phone: z.string().optional(),
  expiresAt: z.string().optional(),
  used: z.boolean().optional(),
  createdAt: z.string().optional(),
}).nullable();

const VerificationCodesListSchema = z.object({
  data: z.array(VerificationCodeSchema.unwrap()),
  meta: z.object({
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
  }),
});

// OTP 活跃状态 Schema
const OTPActiveStatusSchema = z.object({
  phoneNumber: z.string(),
  type: z.string(),
  hasActive: z.boolean(),
  remainingSeconds: z.number().int(),
});

// 号码 Schema
const PhoneNumberSchema = z.object({
  id: z.string(),
  number: z.string(),
  country: z.string().optional(),
  status: z.string(),
  expiresAt: z.string().optional(),
  createdAt: z.string().optional(),
}).passthrough();

const NumbersListSchema = z.object({
  data: z.array(PhoneNumberSchema),
  meta: z.object({
    total: z.number().int(),
    page: z.number().int(),
    limit: z.number().int(),
  }),
});

// 号码统计 Schema
const NumberStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  expired: z.number().int().nonnegative().optional(),
}).passthrough();

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

// ==================== 类型定义 ====================

export interface SMSListResponse {
  data: ServiceSMSRecord[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface VerificationCodesListResponse {
  data: ServiceVerificationCode[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface OTPActiveStatus {
  phoneNumber: string;
  type: string;
  hasActive: boolean;
  remainingSeconds: number;
}

export interface NumbersListResponse {
  data: ServicePhoneNumber[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface NumberStats {
  total: number;
  active: number;
  expired?: number;
}

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
  return useValidatedQuery<SMSListResponse>({
    queryKey: smsKeys.mySMS(params),
    queryFn: () => getMySMS(params),
    schema: SMSListResponseSchema,
    staleTime: StaleTimeConfig.sms,
  });
};

/**
 * 获取我的短信统计
 */
export const useMySMSStats = () => {
  return useValidatedQuery<ServiceSMSStats>({
    queryKey: smsKeys.stats(),
    queryFn: getMySMSStats,
    schema: SMSStatsSchema,
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
  return useValidatedQuery<SMSListResponse>({
    queryKey: smsKeys.deviceSMS(deviceId, params),
    queryFn: () => getDeviceSMS(deviceId, params),
    schema: SMSListResponseSchema,
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
  return useValidatedQuery<VerificationCodesListResponse>({
    queryKey: smsKeys.myCodes(params),
    queryFn: () => getMyVerificationCodes(params),
    schema: VerificationCodesListSchema,
    staleTime: StaleTimeConfig.sms,
  });
};

/**
 * 检查手机号是否有活跃验证码
 * 注意: 后端返回格式已更改为 OTP 活跃状态检查
 */
export const useVerificationCodeByPhone = (phone: string, options?: { enabled?: boolean }) => {
  return useValidatedQuery<OTPActiveStatus>({
    queryKey: smsKeys.codeByPhone(phone),
    queryFn: () => getVerificationCodeByPhone(phone),
    schema: OTPActiveStatusSchema,
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
  return useValidatedQuery<ServiceVerificationCode | null>({
    queryKey: smsKeys.deviceLatestCode(deviceId, params),
    queryFn: () => getDeviceLatestCode(deviceId, params),
    schema: VerificationCodeSchema,
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
  return useValidatedQuery<NumbersListResponse>({
    queryKey: smsKeys.myNumbers(params),
    queryFn: () => getMyNumbers(params),
    schema: NumbersListSchema,
    staleTime: StaleTimeConfig.sms,
  });
};

/**
 * 获取我的号码统计
 */
export const useMyNumberStats = () => {
  return useValidatedQuery<NumberStats>({
    queryKey: smsKeys.numberStats(),
    queryFn: getMyNumberStats,
    schema: NumberStatsSchema,
    staleTime: StaleTimeConfig.sms,
    refetchInterval: RefetchIntervalConfig.normal,
  });
};

/**
 * 获取号码 (申请新号码)
 */
export const useAcquireNumber = () => {
  const queryClient = useQueryClient();

  return useMutation<ServicePhoneNumber, Error, Parameters<typeof acquireNumber>[0]>({
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
