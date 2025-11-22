import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  // 短信记录
  getSMSList,
  getSMSDetail,
  sendSMS,
  batchSendSMS,
  deleteSMS,
  batchDeleteSMS,
  resendSMS,
  // 统计
  getSMSStats,
  getSMSStatistics,
  getSMSRealtimeStats,
  getSMSProviderComparison,
  exportSMSStatistics,
  // 验证码
  getVerificationCodes,
  getVerificationCode,
  extractVerificationCode,
  batchExtractVerificationCodes,
  getDeviceLatestCode,
  getUserVerificationCodes,
  // 号码池
  getSMSNumbers,
  getSMSNumber,
  addSMSNumber,
  batchAddSMSNumbers,
  deleteSMSNumber,
  batchDeleteSMSNumbers,
  releaseSMSNumber,
  testSMSNumber,
  refreshSMSNumbers,
  getSMSNumberHistory,
  // 供应商
  getSMSProviders,
  getSMSProvider,
  createSMSProvider,
  updateSMSProvider,
  deleteSMSProvider,
  toggleSMSProvider,
  testSMSProvider,
  refreshProviderBalance,
  getSMSProviderPerformance,
  // 设备绑定
  allocateSMSNumberForDevice,
  releaseDeviceSMSNumber,
  getDeviceSMSNumber,
  getDeviceSMS,
  // 类型
  type SMSListParams,
  type SMSListResponse,
  type SMSRecord,
  type SendSMSDto,
  type SMSStats,
  type SMSStatistics,
  type SMSRealtimeStats,
  type SMSProviderComparison,
  type SMSNumber,
  type SMSNumberListParams,
  type SMSNumberListResponse,
  type SMSProvider,
  type CreateSMSProviderDto,
} from '@/services/sms';

/**
 * SMS 短信管理 React Query Hooks (管理员后台)
 *
 * 提供完整的短信管理、号码池管理、供应商管理、统计分析功能
 */

// ==================== 导出类型 ====================

export type {
  SMSListParams,
  SMSListResponse,
  SMSRecord,
  SendSMSDto,
  SMSStats,
  SMSStatistics,
  SMSRealtimeStats,
  SMSProviderComparison,
  SMSNumber,
  SMSNumberListParams,
  SMSNumberListResponse,
  SMSProvider,
  CreateSMSProviderDto,
};

// ==================== Query Keys ====================

export const smsKeys = {
  all: ['sms'] as const,
  lists: () => [...smsKeys.all, 'list'] as const,
  list: (params?: SMSListParams) => [...smsKeys.lists(), params] as const,
  details: () => [...smsKeys.all, 'detail'] as const,
  detail: (id: string) => [...smsKeys.details(), id] as const,
  stats: () => [...smsKeys.all, 'stats'] as const,
  statistics: (params?: any) => [...smsKeys.all, 'statistics', params] as const,
  realtimeStats: () => [...smsKeys.all, 'realtime-stats'] as const,

  codes: () => [...smsKeys.all, 'codes'] as const,
  codeList: (params?: any) => [...smsKeys.codes(), 'list', params] as const,
  codeDetail: (id: string) => [...smsKeys.codes(), id] as const,

  numbers: () => [...smsKeys.all, 'numbers'] as const,
  numberList: (params?: SMSNumberListParams) => [...smsKeys.numbers(), 'list', params] as const,
  numberDetail: (id: string) => [...smsKeys.numbers(), id] as const,
  numberHistory: (id: string) => [...smsKeys.numbers(), id, 'history'] as const,

  providers: () => [...smsKeys.all, 'providers'] as const,
  providerList: () => [...smsKeys.providers(), 'list'] as const,
  providerDetail: (id: string) => [...smsKeys.providers(), id] as const,
  providerPerformance: (params?: any) => [...smsKeys.providers(), 'performance', params] as const,
  providerComparison: (params?: any) => [...smsKeys.providers(), 'comparison', params] as const,

  device: (deviceId: string) => [...smsKeys.all, 'device', deviceId] as const,
  deviceNumber: (deviceId: string) => [...smsKeys.device(deviceId), 'number'] as const,
  deviceMessages: (deviceId: string, params?: any) => [...smsKeys.device(deviceId), 'messages', params] as const,
};

// ==================== SMS 消息管理 ====================

/**
 * 获取短信列表
 */
export const useSMSList = (params?: SMSListParams) => {
  return useQuery<SMSListResponse>({
    queryKey: smsKeys.list(params),
    queryFn: () => getSMSList(params),
  });
};

/**
 * 获取短信详情
 */
export const useSMSDetail = (id: string, options?: { enabled?: boolean }) => {
  return useQuery<SMSRecord>({
    queryKey: smsKeys.detail(id),
    queryFn: () => getSMSDetail(id),
    enabled: options?.enabled !== false && !!id,
  });
};

/**
 * 获取短信统计
 */
export const useSMSStats = () => {
  return useQuery<SMSStats>({
    queryKey: smsKeys.stats(),
    queryFn: getSMSStats,
    refetchInterval: 60000, // SMS统计 - 中等实时性
  });
};

/**
 * 获取详细统计数据
 */
export const useSMSStatistics = (params: {
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
  provider?: string;
}) => {
  return useQuery<SMSStatistics>({
    queryKey: smsKeys.statistics(params),
    queryFn: () => getSMSStatistics(params),
  });
};

/**
 * 获取实时统计
 */
export const useSMSRealtimeStats = () => {
  return useQuery<SMSRealtimeStats>({
    queryKey: smsKeys.realtimeStats(),
    queryFn: getSMSRealtimeStats,
    refetchInterval: 30000, // SMS实时统计 - 高实时性
  });
};

/**
 * 获取供应商对比统计
 */
export const useSMSProviderComparison = (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery<SMSProviderComparison[]>({
    queryKey: smsKeys.providerComparison(params),
    queryFn: () => getSMSProviderComparison(params),
  });
};

// ==================== SMS Mutations ====================

/**
 * 发送短信
 */
export const useSendSMS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendSMS,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: smsKeys.stats() });
      message.success('短信发送成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '短信发送失败');
    },
  });
};

/**
 * 批量发送短信
 */
export const useBatchSendSMS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchSendSMS,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: smsKeys.stats() });
      message.success('批量发送完成');
    },
    onError: (error: any) => {
      message.error(error?.message || '批量发送失败');
    },
  });
};

/**
 * 重新发送短信
 */
export const useResendSMS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resendSMS,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.lists() });
      message.success('重新发送成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '重新发送失败');
    },
  });
};

/**
 * 删除短信
 */
export const useDeleteSMS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSMS,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.lists() });
      message.success('短信删除成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '短信删除失败');
    },
  });
};

/**
 * 批量删除短信
 */
export const useBatchDeleteSMS = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchDeleteSMS,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.lists() });
      message.success('批量删除成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '批量删除失败');
    },
  });
};

/**
 * 导出统计报表
 */
export const useExportSMSStatistics = () => {
  return useMutation({
    mutationFn: exportSMSStatistics,
    onSuccess: () => {
      message.success('报表导出成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '报表导出失败');
    },
  });
};

// ==================== 验证码管理 ====================

/**
 * 获取验证码列表
 */
export const useVerificationCodeList = (params?: {
  page?: number;
  limit?: number;
  codeType?: string;
  status?: string;
  phone?: string;
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery({
    queryKey: smsKeys.codeList(params),
    queryFn: () => getVerificationCodes(params),
  });
};

/**
 * 获取验证码详情
 */
export const useVerificationCodeDetail = (id: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: smsKeys.codeDetail(id),
    queryFn: () => getVerificationCode(id),
    enabled: options?.enabled !== false && !!id,
  });
};

/**
 * 提取验证码
 */
export const useExtractVerificationCode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: extractVerificationCode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.codes() });
      message.success('验证码提取成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '验证码提取失败');
    },
  });
};

/**
 * 批量提取验证码
 */
export const useBatchExtractVerificationCodes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchExtractVerificationCodes,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.codes() });
      message.success('批量提取成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '批量提取失败');
    },
  });
};

/**
 * 获取设备最新验证码
 */
export const useDeviceLatestCode = (deviceId: string, params?: {
  codeType?: string;
  provider?: string;
}) => {
  return useQuery({
    queryKey: [...smsKeys.device(deviceId), 'latest-code', params],
    queryFn: () => getDeviceLatestCode(deviceId, params),
    enabled: !!deviceId,
  });
};

/**
 * 获取用户验证码历史
 */
export const useUserVerificationCodes = (userId: string, params?: {
  codeType?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: [...smsKeys.all, 'user', userId, 'codes', params],
    queryFn: () => getUserVerificationCodes(userId, params),
    enabled: !!userId,
  });
};

// ==================== 号码池管理 ====================

/**
 * 获取号码列表
 */
export const useSMSNumbers = (params?: SMSNumberListParams) => {
  return useQuery<SMSNumberListResponse>({
    queryKey: smsKeys.numberList(params),
    queryFn: () => getSMSNumbers(params),
  });
};

/**
 * 获取号码详情
 */
export const useSMSNumber = (id: string, options?: { enabled?: boolean }) => {
  return useQuery<SMSNumber>({
    queryKey: smsKeys.numberDetail(id),
    queryFn: () => getSMSNumber(id),
    enabled: options?.enabled !== false && !!id,
  });
};

/**
 * 获取号码使用历史
 */
export const useSMSNumberHistory = (numberId: string, params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: smsKeys.numberHistory(numberId),
    queryFn: () => getSMSNumberHistory(numberId, params),
    enabled: !!numberId,
  });
};

/**
 * 添加号码
 */
export const useAddSMSNumber = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addSMSNumber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.numbers() });
      message.success('号码添加成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '号码添加失败');
    },
  });
};

/**
 * 批量添加号码
 */
export const useBatchAddSMSNumbers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchAddSMSNumbers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.numbers() });
      message.success('批量添加成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '批量添加失败');
    },
  });
};

/**
 * 删除号码
 */
export const useDeleteSMSNumber = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSMSNumber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.numbers() });
      message.success('号码删除成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '号码删除失败');
    },
  });
};

/**
 * 批量删除号码
 */
export const useBatchDeleteSMSNumbers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: batchDeleteSMSNumbers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.numbers() });
      message.success('批量删除成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '批量删除失败');
    },
  });
};

/**
 * 释放号码
 */
export const useReleaseSMSNumber = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: releaseSMSNumber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.numbers() });
      message.success('号码释放成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '号码释放失败');
    },
  });
};

/**
 * 测试号码
 */
export const useTestSMSNumber = () => {
  return useMutation({
    mutationFn: testSMSNumber,
    onSuccess: () => {
      message.success('号码测试成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '号码测试失败');
    },
  });
};

/**
 * 刷新号码池
 */
export const useRefreshSMSNumbers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: refreshSMSNumbers,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.numbers() });
      message.success('号码池刷新成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '号码池刷新失败');
    },
  });
};

// ==================== 供应商管理 ====================

/**
 * 获取短信供应商列表
 */
export const useSMSProviders = () => {
  return useQuery<SMSProvider[]>({
    queryKey: smsKeys.providerList(),
    queryFn: getSMSProviders,
  });
};

/**
 * 获取供应商详情
 */
export const useSMSProvider = (providerId: string, options?: { enabled?: boolean }) => {
  return useQuery<SMSProvider>({
    queryKey: smsKeys.providerDetail(providerId),
    queryFn: () => getSMSProvider(providerId),
    enabled: options?.enabled !== false && !!providerId,
  });
};

/**
 * 获取供应商性能对比
 */
export const useSMSProviderPerformance = (params?: {
  startDate?: string;
  endDate?: string;
}) => {
  return useQuery({
    queryKey: smsKeys.providerPerformance(params),
    queryFn: () => getSMSProviderPerformance(params),
  });
};

/**
 * 创建短信供应商
 */
export const useCreateSMSProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSMSProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.providers() });
      message.success('供应商创建成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '供应商创建失败');
    },
  });
};

/**
 * 更新供应商
 */
export const useUpdateSMSProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ providerId, data }: { providerId: string; data: Partial<CreateSMSProviderDto> }) =>
      updateSMSProvider(providerId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: smsKeys.providers() });
      queryClient.invalidateQueries({ queryKey: smsKeys.providerDetail(variables.providerId) });
      message.success('供应商更新成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '供应商更新失败');
    },
  });
};

/**
 * 删除供应商
 */
export const useDeleteSMSProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSMSProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.providers() });
      message.success('供应商删除成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '供应商删除失败');
    },
  });
};

/**
 * 切换供应商启用状态
 */
export const useToggleSMSProvider = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ providerId, enabled }: { providerId: string; enabled: boolean }) =>
      toggleSMSProvider(providerId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.providers() });
      message.success('状态切换成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '状态切换失败');
    },
  });
};

/**
 * 测试供应商连接
 */
export const useTestSMSProvider = () => {
  return useMutation({
    mutationFn: testSMSProvider,
    onSuccess: () => {
      message.success('连接测试成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '测试失败');
    },
  });
};

/**
 * 刷新供应商余额
 */
export const useRefreshProviderBalance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: refreshProviderBalance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.providers() });
      message.success('余额刷新成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '余额刷新失败');
    },
  });
};

// ==================== 设备绑定 ====================

/**
 * 为设备分配号码
 */
export const useAllocateSMSNumberForDevice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ deviceId, params }: {
      deviceId: string;
      params?: { country?: string; provider?: string };
    }) => allocateSMSNumberForDevice(deviceId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.numbers() });
      message.success('号码分配成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '号码分配失败');
    },
  });
};

/**
 * 释放设备的号码
 */
export const useReleaseDeviceSMSNumber = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: releaseDeviceSMSNumber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: smsKeys.numbers() });
      message.success('号码释放成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '号码释放失败');
    },
  });
};

/**
 * 获取设备绑定的号码
 */
export const useDeviceSMSNumber = (deviceId: string) => {
  return useQuery({
    queryKey: smsKeys.deviceNumber(deviceId),
    queryFn: () => getDeviceSMSNumber(deviceId),
    enabled: !!deviceId,
  });
};

/**
 * 获取设备接收的短信
 */
export const useDeviceSMS = (deviceId: string, params?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: smsKeys.deviceMessages(deviceId, params),
    queryFn: () => getDeviceSMS(deviceId, params),
    enabled: !!deviceId,
  });
};

// ========== 导出别名 (Backward Compatibility) ==========
export { useSMSNumbers as useNumberPool };
export type { SMSNumber as PhoneNumber } from '@/services/sms';

