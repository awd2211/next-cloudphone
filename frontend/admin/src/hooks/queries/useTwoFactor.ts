/**
 * TwoFactor React Query Hooks
 *
 * 基于 @/services/twoFactor
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as twoFactorService from '@/services/twoFactor';
import { useValidatedQuery } from './useValidatedQuery';
import { TwoFactorSecretSchema } from '@/schemas/api.schemas';

/**
 * Query Keys
 */
export const twoFactorKeys = {
  all: ['2fa'] as const,
  secret: () => [...twoFactorKeys.all, 'secret'] as const,
};

/**
 * 生成2FA密钥和二维码
 */
export const useGenerate2FASecret = () => {
  return useValidatedQuery({
    queryKey: twoFactorKeys.secret(),
    queryFn: () => twoFactorService.generate2FASecret(),
    schema: TwoFactorSecretSchema,
    enabled: false, // 默认不自动获取，需要手动触发
  });
};

/**
 * 启用2FA Mutation
 */
export const useEnable2FA = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { token: string }) => twoFactorService.enable2FA(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: twoFactorKeys.secret() });
      message.success('双因素认证已启用');
    },
    onError: () => {
      message.error('启用双因素认证失败');
    },
  });
};

/**
 * 禁用2FA Mutation
 */
export const useDisable2FA = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { token: string }) => twoFactorService.disable2FA(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: twoFactorKeys.secret() });
      message.success('双因素认证已禁用');
    },
    onError: () => {
      message.error('禁用双因素认证失败');
    },
  });
};

/**
 * 2FA登录验证 Mutation
 */
export const useVerify2FA = () => {
  return useMutation({
    mutationFn: (data: { token: string }) => twoFactorService.verify2FA(data as any),
    onSuccess: () => {
      message.success('验证成功');
    },
    onError: () => {
      message.error('验证失败');
    },
  });
};
