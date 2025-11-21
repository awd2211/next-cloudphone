/**
 * 推荐返利中心 React Query Hooks (用户端)
 *
 * 提供邀请好友、推荐返利、提现管理等功能
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import type {
  ReferralStats,
  ReferralRecord,
  WithdrawRecord,
  ReferralConfig,
  ReferralStatus,
  WithdrawStatus,
} from '@/services/referral';
import * as referralService from '@/services/referral';
import {
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig } from '../utils/cacheConfig';

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
  return useQuery<ReferralConfig>({
    queryKey: referralKeys.config(),
    queryFn: () => referralService.getReferralConfig(),
    staleTime: StaleTimeConfig.VERY_LONG, // 5分钟
  });
};

/**
 * 获取邀请统计
 */
export const useReferralStats = () => {
  return useQuery<ReferralStats>({
    queryKey: referralKeys.stats(),
    queryFn: () => referralService.getReferralStats(),
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
  return useQuery<{
    data: ReferralRecord[];
    total: number;
    page: number;
    pageSize: number;
  }>({
    queryKey: referralKeys.records(params),
    queryFn: () => referralService.getReferralRecords(params),
    staleTime: StaleTimeConfig.MEDIUM, // 30秒
    placeholderData: (previousData) => previousData,
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
  return useQuery<{
    data: WithdrawRecord[];
    total: number;
    page: number;
    pageSize: number;
  }>({
    queryKey: referralKeys.withdrawals(params),
    queryFn: () => referralService.getWithdrawRecords(params),
    staleTime: StaleTimeConfig.MEDIUM, // 30秒
    placeholderData: (previousData) => previousData,
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
  return useQuery<{
    data: Array<{
      id: string;
      type: 'invite' | 'bonus' | 'other';
      amount: number;
      description: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
  }>({
    queryKey: referralKeys.earnings(params),
    queryFn: () => referralService.getEarningsDetail(params),
    staleTime: StaleTimeConfig.MEDIUM, // 30秒
    placeholderData: (previousData) => previousData,
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
