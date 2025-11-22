/**
 * 认证管理 React Query Hooks (用户端)
 *
 * 提供登录、注册、验证码、2FA、密码重置等功能
 * ✅ 使用 Zod Schema 验证 API 响应
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import type {
  LoginDto,
  RegisterDto,
  User,
  CaptchaResponse,
} from '@/types';
import * as authService from '@/services/auth';
import type {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  Verify2FADto,
  Disable2FADto,
  Enable2FADto,
  LoginHistoryParams,
  VerifyResetTokenResponse,
} from '@/services/auth';
import {
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig } from '../utils/cacheConfig';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import { z } from 'zod';

// 验证码响应 Schema (匹配 @/types/CaptchaResponse)
const CaptchaResponseSchema = z.object({
  id: z.string(),
  svg: z.string(),
}).passthrough();

// 当前用户 Schema
const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().optional(),
  nickname: z.string().optional(),
  avatar: z.string().optional(),
  phone: z.string().optional(),
  roles: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
}).passthrough();

// 2FA 状态 Schema
const TwoFactorStatusSchema = z.object({
  enabled: z.boolean(),
  hasSecret: z.boolean(),
});

// 登录历史 Schema
const LoginHistoryItemSchema = z.object({
  id: z.string(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  location: z.string().optional(),
  success: z.boolean().optional(),
  createdAt: z.string().optional(),
}).passthrough();

const LoginHistoryResponseSchema = z.object({
  data: z.array(LoginHistoryItemSchema),
  total: z.number().int().optional(),
}).passthrough();

// 活跃会话 Schema
const SessionSchema = z.object({
  id: z.string(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  location: z.string().optional(),
  lastActiveAt: z.string().optional(),
  createdAt: z.string().optional(),
  isCurrent: z.boolean().optional(),
}).passthrough();

const ActiveSessionsResponseSchema = z.array(SessionSchema);

// 验证重置 Token Schema
const VerifyResetTokenResponseSchema = z.object({
  valid: z.boolean(),
  email: z.string().optional(),
  message: z.string().optional(),
}).passthrough();

// ==================== 类型定义 ====================
// 重新导出常用类型以便 pages 导入
export type { CaptchaResponse, User } from '@/types';
export type { VerifyResetTokenResponse } from '@/services/auth';

export interface TwoFactorStatus {
  enabled: boolean;
  hasSecret: boolean;
}

export interface LoginHistoryItem {
  id: string;
  ip?: string;
  userAgent?: string;
  location?: string;
  success?: boolean;
  createdAt?: string;
}

export interface LoginHistoryResponse {
  data: LoginHistoryItem[];
  total?: number;
}

export interface Session {
  id: string;
  ip?: string;
  userAgent?: string;
  location?: string;
  lastActiveAt?: string;
  createdAt?: string;
  isCurrent?: boolean;
}

// ==================== Query Keys ====================

export const authKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authKeys.all, 'current-user'] as const,
  captcha: () => [...authKeys.all, 'captcha'] as const,
  twoFactorStatus: () => [...authKeys.all, '2fa-status'] as const,
  loginHistory: (params?: LoginHistoryParams) => [...authKeys.all, 'login-history', params] as const,
  activeSessions: () => [...authKeys.all, 'sessions'] as const,
};

// ==================== Query Hooks ====================

/**
 * 获取验证码
 * 自动刷新机制
 */
export const useCaptcha = () => {
  return useValidatedQuery<CaptchaResponse>({
    queryKey: authKeys.captcha(),
    queryFn: () => authService.getCaptcha(),
    schema: CaptchaResponseSchema,
    staleTime: 0, // 立即过期，每次都获取新的
    gcTime: 0, // 不缓存
  });
};

/**
 * 获取当前用户信息
 */
export const useCurrentUser = () => {
  return useValidatedQuery<User>({
    queryKey: authKeys.currentUser(),
    queryFn: () => authService.getCurrentUser(),
    schema: UserSchema,
    staleTime: StaleTimeConfig.userProfile,
    retry: false, // 如果未登录，不重试
  });
};

/**
 * 获取双因素认证状态
 */
export const use2FAStatus = () => {
  return useValidatedQuery<TwoFactorStatus>({
    queryKey: authKeys.twoFactorStatus(),
    queryFn: () => authService.get2FAStatus(),
    schema: TwoFactorStatusSchema,
    staleTime: StaleTimeConfig.userProfile,
  });
};

/**
 * 获取登录历史
 */
export const useLoginHistory = (params?: LoginHistoryParams) => {
  return useValidatedQuery<LoginHistoryResponse>({
    queryKey: authKeys.loginHistory(params),
    queryFn: () => authService.getLoginHistory(params),
    schema: LoginHistoryResponseSchema,
    staleTime: StaleTimeConfig.LONG,
  });
};

/**
 * 获取活跃会话
 */
export const useActiveSessions = () => {
  return useValidatedQuery<Session[]>({
    queryKey: authKeys.activeSessions(),
    queryFn: () => authService.getActiveSessions(),
    schema: ActiveSessionsResponseSchema,
    staleTime: StaleTimeConfig.MEDIUM,
  });
};

// ==================== Mutation Hooks ====================

/**
 * 登录
 */
export const useLogin = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation<
    { token: string; user: User; requiresTwoFactor?: boolean; message?: string },
    unknown,
    LoginDto
  >({
    mutationFn: (data) => authService.login(data),
    onSuccess: (result) => {
      // 如果需要2FA验证，不执行正常登录流程
      if (result.requiresTwoFactor) {
        message.info(result.message || '请输入双因素认证代码');
        return;
      }

      // 正常登录流程
      localStorage.setItem('token', result.token);
      localStorage.setItem('user', JSON.stringify(result.user));
      handleMutationSuccess('登录成功');

      // 刷新用户信息
      queryClient.setQueryData(authKeys.currentUser(), result.user);

      // 跳转到首页
      navigate('/dashboard');
    },
    onError: (error) => {
      handleMutationError(error, '登录失败');
      // 登录失败后刷新验证码
      queryClient.invalidateQueries({ queryKey: authKeys.captcha() });
    },
  });
};

/**
 * 注册
 */
export const useRegister = () => {
  return useMutation<User, unknown, RegisterDto>({
    mutationFn: (data) => authService.register(data),
    onSuccess: () => {
      handleMutationSuccess('注册成功，请登录');
    },
    onError: (error) => {
      handleMutationError(error, '注册失败');
    },
  });
};

/**
 * 退出登录
 */
export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      queryClient.clear(); // 清除所有缓存
      handleMutationSuccess('已退出登录');
      navigate('/login');
    },
    onError: (error) => {
      handleMutationError(error, '退出失败');
    },
  });
};

/**
 * 修改密码
 */
export const useChangePassword = () => {
  return useMutation<{ message: string }, unknown, ChangePasswordDto>({
    mutationFn: (data) => authService.changePassword(data),
    onSuccess: () => {
      handleMutationSuccess('密码修改成功，请重新登录');
    },
    onError: (error) => {
      handleMutationError(error, '密码修改失败');
    },
  });
};

/**
 * 忘记密码 - 发送重置链接
 */
export const useForgotPassword = () => {
  return useMutation<{ message: string }, unknown, ForgotPasswordDto>({
    mutationFn: (data) => authService.forgotPassword(data),
    onSuccess: () => {
      handleMutationSuccess('重置链接已发送，请查收');
    },
    onError: (error) => {
      handleMutationError(error, '发送失败');
    },
  });
};

/**
 * 验证重置密码 token
 */
export const useVerifyResetToken = (token: string, options?: { enabled?: boolean }) => {
  return useValidatedQuery<VerifyResetTokenResponse>({
    queryKey: [...authKeys.all, 'verify-reset-token', token],
    queryFn: () => authService.verifyResetToken(token),
    schema: VerifyResetTokenResponseSchema,
    enabled: options?.enabled !== false && !!token,
    retry: false,
    staleTime: 0,
  });
};

/**
 * 重置密码
 */
export const useResetPassword = () => {
  const navigate = useNavigate();

  return useMutation<{ message: string }, unknown, ResetPasswordDto>({
    mutationFn: (data) => authService.resetPassword(data),
    onSuccess: () => {
      handleMutationSuccess('密码重置成功，请登录');
      navigate('/login');
    },
    onError: (error) => {
      handleMutationError(error, '密码重置失败');
    },
  });
};

/**
 * 生成双因素认证密钥
 */
export const useGenerate2FA = () => {
  return useMutation<{ secret: string; qrCode: string; otpauthUrl: string }, unknown, void>({
    mutationFn: () => authService.generate2FA(),
    onError: (error) => {
      handleMutationError(error, '生成双因素认证密钥失败');
    },
  });
};

/**
 * 启用双因素认证
 */
export const useEnable2FA = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, unknown, Enable2FADto>({
    mutationFn: (data) => authService.enable2FA(data),
    onSuccess: () => {
      handleMutationSuccess('双因素认证已启用');
      queryClient.invalidateQueries({ queryKey: authKeys.twoFactorStatus() });
    },
    onError: (error) => {
      handleMutationError(error, '启用双因素认证失败');
    },
  });
};

/**
 * 验证双因素认证代码
 */
export const useVerify2FACode = () => {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, Verify2FADto>({
    mutationFn: (data) => authService.verify2FACode(data),
    onSuccess: () => {
      handleMutationSuccess('双因素认证已启用');
      queryClient.invalidateQueries({ queryKey: authKeys.twoFactorStatus() });
    },
    onError: (error) => {
      handleMutationError(error, '验证失败');
    },
  });
};

/**
 * 禁用双因素认证
 */
export const useDisable2FA = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, unknown, Disable2FADto>({
    mutationFn: (data) => authService.disable2FA(data),
    onSuccess: () => {
      handleMutationSuccess('双因素认证已禁用');
      queryClient.invalidateQueries({ queryKey: authKeys.twoFactorStatus() });
    },
    onError: (error) => {
      handleMutationError(error, '禁用失败');
    },
  });
};

/**
 * 终止单个会话
 */
export const useTerminateSession = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, unknown, string>({
    mutationFn: (sessionId) => authService.terminateSession(sessionId),
    onSuccess: () => {
      handleMutationSuccess('会话已终止');
      queryClient.invalidateQueries({ queryKey: authKeys.activeSessions() });
    },
    onError: (error) => {
      handleMutationError(error, '终止会话失败');
    },
  });
};

/**
 * 终止所有其他会话
 */
export const useTerminateAllSessions = () => {
  const queryClient = useQueryClient();

  return useMutation<{ message: string }, unknown, void>({
    mutationFn: () => authService.terminateAllSessions(),
    onSuccess: () => {
      handleMutationSuccess('所有其他会话已终止');
      queryClient.invalidateQueries({ queryKey: authKeys.activeSessions() });
    },
    onError: (error) => {
      handleMutationError(error, '终止会话失败');
    },
  });
};
