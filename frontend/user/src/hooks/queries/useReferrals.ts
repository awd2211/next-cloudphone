/**
 * 推荐返利中心 React Query Hooks (用户端)
 *
 * 提供邀请好友、推荐返利、提现管理等功能
 * ✅ 使用 Zod Schema 验证 API 响应
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import type {
  ReferralStatus,
  WithdrawStatus,
  ReferralStats as ServiceReferralStats,
  ReferralConfig as ServiceReferralConfig,
  ReferralRecord as ServiceReferralRecord,
  WithdrawRecord as ServiceWithdrawRecord,
} from '@/services/referral';
import * as referralService from '@/services/referral';

// 重新导出 service 类型供 pages 使用
export type { ReferralStatus, WithdrawStatus } from '@/services/referral';
export type ReferralStats = ServiceReferralStats;
export type ReferralConfig = ServiceReferralConfig;
export type ReferralRecord = ServiceReferralRecord;
export type WithdrawRecord = ServiceWithdrawRecord;
import {
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig } from '../utils/cacheConfig';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import { z } from 'zod';

// 邀请配置 Schema
const ReferralConfigSchema = z.object({
  inviteCode: z.string().optional(),
  inviteLink: z.string().optional(),
  qrCodeUrl: z.string().optional(),
  rewardPerInvite: z.number().optional(),
  rewardType: z.string().optional(),
  minWithdrawAmount: z.number().optional(),
}).passthrough();

// 邀请统计 Schema
const ReferralStatsSchema = z.object({
  totalInvites: z.number().int().nonnegative().optional(),
  successfulInvites: z.number().int().nonnegative().optional(),
  pendingInvites: z.number().int().nonnegative().optional(),
  totalEarnings: z.number().nonnegative().optional(),
  availableBalance: z.number().nonnegative().optional(),
  withdrawnAmount: z.number().nonnegative().optional(),
}).passthrough();

// 邀请记录 Schema
const ReferralRecordSchema = z.object({
  id: z.string(),
  inviteeId: z.string().optional(),
  inviteeName: z.string().optional(),
  status: z.string().optional(),
  reward: z.number().optional(),
  createdAt: z.string().optional(),
}).passthrough();

const ReferralRecordsResponseSchema = z.object({
  data: z.array(ReferralRecordSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

// 提现记录 Schema
const WithdrawRecordSchema = z.object({
  id: z.string(),
  amount: z.number(),
  method: z.string().optional(),
  account: z.string().optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
}).passthrough();

const WithdrawRecordsResponseSchema = z.object({
  data: z.array(WithdrawRecordSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

// 收益明细 Schema
const EarningDetailSchema = z.object({
  id: z.string(),
  type: z.enum(['invite', 'bonus', 'other']),
  amount: z.number(),
  description: z.string(),
  createdAt: z.string(),
});

const EarningsResponseSchema = z.object({
  data: z.array(EarningDetailSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
});

// ==================== 响应类型定义 ====================

export interface ReferralRecordsResponse {
  data: ServiceReferralRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface WithdrawRecordsResponse {
  data: ServiceWithdrawRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EarningDetail {
  id: string;
  type: 'invite' | 'bonus' | 'other';
  amount: number;
  description: string;
  createdAt: string;
}

export interface EarningsResponse {
  data: EarningDetail[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== Query Keys ====================

export const referralKeys = {
  all: ['referrals'] as const,
  config: () => [...referralKeys.all, 'config'] as const,
  stats: () => [...referralKeys.all, 'stats'] as const,
  records: (params?: any) => [...referralKeys.all, 'records', params] as const,
  withdrawals: (params?: any) => [...referralKeys.all, 'withdrawals', params] as const,
  earnings: (params?: any) => [...referralKeys.all, 'earnings', params] as const,
};

// ==================== Query Hooks ====================

/**
 * 获取邀请配置
 */
export const useReferralConfig = () => {
  return useValidatedQuery<ServiceReferralConfig>({
    queryKey: referralKeys.config(),
    queryFn: () => referralService.getReferralConfig(),
    schema: ReferralConfigSchema,
    staleTime: StaleTimeConfig.VERY_LONG, // 5分钟
  });
};

/**
 * 获取邀请统计
 */
export const useReferralStats = () => {
  return useValidatedQuery<ServiceReferralStats>({
    queryKey: referralKeys.stats(),
    queryFn: () => referralService.getReferralStats(),
    schema: ReferralStatsSchema,
    staleTime: StaleTimeConfig.MEDIUM, // 30秒
  });
};

/**
 * 获取邀请记录
 */
export const useReferralRecords = (params?: {
  status?: ReferralStatus;
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
}) => {
  return useValidatedQuery<ReferralRecordsResponse>({
    queryKey: referralKeys.records(params),
    queryFn: () => referralService.getReferralRecords(params),
    schema: ReferralRecordsResponseSchema,
    staleTime: StaleTimeConfig.MEDIUM, // 30秒
    placeholderData: (previousData: ReferralRecordsResponse | undefined) => previousData,
  });
};

/**
 * 获取提现记录
 */
export const useWithdrawRecords = (params?: {
  status?: WithdrawStatus;
  page?: number;
  pageSize?: number;
}) => {
  return useValidatedQuery<WithdrawRecordsResponse>({
    queryKey: referralKeys.withdrawals(params),
    queryFn: () => referralService.getWithdrawRecords(params),
    schema: WithdrawRecordsResponseSchema,
    staleTime: StaleTimeConfig.MEDIUM, // 30秒
    placeholderData: (previousData: WithdrawRecordsResponse | undefined) => previousData,
  });
};

/**
 * 获取收益明细
 */
export const useEarningsDetail = (params?: {
  type?: 'invite' | 'bonus' | 'other';
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
}) => {
  return useValidatedQuery<EarningsResponse>({
    queryKey: referralKeys.earnings(params),
    queryFn: () => referralService.getEarningsDetail(params),
    schema: EarningsResponseSchema,
    staleTime: StaleTimeConfig.MEDIUM, // 30秒
    placeholderData: (previousData: EarningsResponse | undefined) => previousData,
  });
};

// ==================== Mutation Hooks ====================

/**
 * 生成邀请码
 */
export const useGenerateInviteCode = () => {
  const queryClient = useQueryClient();

  return useMutation<
    {
      code: string;
      link: string;
      qrCodeUrl: string;
    },
    unknown,
    void
  >({
    mutationFn: () => referralService.generateInviteCode(),
    onSuccess: () => {
      handleMutationSuccess('邀请码生成成功');
      queryClient.invalidateQueries({ queryKey: referralKeys.config() });
    },
    onError: (error) => {
      handleMutationError(error, '生成失败');
    },
  });
};

/**
 * 申请提现
 */
export const useApplyWithdraw = () => {
  const queryClient = useQueryClient();

  return useMutation<
    {
      withdrawId: string;
      message: string;
      estimatedArrival: string;
    },
    unknown,
    {
      amount: number;
      method: 'alipay' | 'wechat' | 'bank';
      account: string;
      accountName?: string;
      remark?: string;
    }
  >({
    mutationFn: (data) => referralService.applyWithdraw(data),
    onSuccess: (result) => {
      handleMutationSuccess(result.message || '提现申请已提交');
      queryClient.invalidateQueries({ queryKey: referralKeys.withdrawals() });
      queryClient.invalidateQueries({ queryKey: referralKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '提现申请失败');
    },
  });
};

/**
 * 取消提现
 */
export const useCancelWithdraw = () => {
  const queryClient = useQueryClient();

  return useMutation<
    {
      success: boolean;
      message: string;
    },
    unknown,
    string
  >({
    mutationFn: (withdrawId) => referralService.cancelWithdraw(withdrawId),
    onSuccess: (result) => {
      handleMutationSuccess(result.message || '提现已取消');
      queryClient.invalidateQueries({ queryKey: referralKeys.withdrawals() });
      queryClient.invalidateQueries({ queryKey: referralKeys.stats() });
    },
    onError: (error) => {
      handleMutationError(error, '取消失败');
    },
  });
};

/**
 * 生成邀请海报
 */
export const useGeneratePoster = () => {
  return useMutation<
    {
      posterUrl: string;
    },
    unknown,
    void
  >({
    mutationFn: () => referralService.generatePoster(),
    onMutate: () => {
      message.loading({ content: '生成中...', key: 'generate-poster' });
    },
    onSuccess: () => {
      message.success({ content: '海报生成成功', key: 'generate-poster' });
    },
    onError: (_error: unknown) => {
      message.error({
        content: '生成失败',
        key: 'generate-poster',
      });
    },
  });
};

/**
 * 分享到社交平台
 */
export const useShareToSocial = () => {
  return useMutation<
    {
      shareUrl: string;
      shareText: string;
    },
    unknown,
    {
      platform: 'wechat' | 'qq' | 'weibo' | 'link';
      inviteCode: string;
    }
  >({
    mutationFn: (params) => referralService.shareToSocial(params),
    onSuccess: (result) => {
      if (result.shareUrl) {
        // 复制分享链接到剪贴板
        navigator.clipboard.writeText(result.shareUrl);
        message.success('分享链接已复制到剪贴板');
      }
    },
    onError: (error) => {
      handleMutationError(error, '分享失败');
    },
  });
};
