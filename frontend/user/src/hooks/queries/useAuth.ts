/**
 * 认证管理 React Query Hooks (用户端)
 *
 * 提供登录、注册、验证码、2FA、密码重置等功能
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import type {
  LoginDto,
  RegisterDto,
  CaptchaResponse,
  User,
} from '@/types';
import * as authService from '@/services/auth';
import type {
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  Verify2FADto,
  Disable2FADto,
  LoginHistoryParams,
} from '@/services/auth';
import {
  handleMutationError,
  handleMutationSuccess,
} from '../utils/errorHandler';
import { StaleTimeConfig } from '../utils/cacheConfig';

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
  return useQuery<CaptchaResponse>({
    queryKey: authKeys.captcha(),
    queryFn: () => authService.getCaptcha(),
    staleTime: 0, // 立即过期，每次都获取新的
    gcTime: 0, // 不缓存
  });
};

/**
 * 获取当前用户信息
 */
export const useCurrentUser = () => {
  return useQuery<User>({
    queryKey: authKeys.currentUser(),
    queryFn: () => authService.getCurrentUser(),
    staleTime: StaleTimeConfig.userProfile,
    retry: false, // 如果未登录，不重试
  });
};

/**
 * 获取双因素认证状态
 */
export const use2FAStatus = () => {
  return useQuery<{ enabled: boolean; qrCode?: string; secret?: string }>({
    queryKey: authKeys.twoFactorStatus(),
    queryFn: () => authService.get2FAStatus(),
    staleTime: StaleTimeConfig.userProfile,
  });
};

/**
 * 获取登录历史
 */
export const useLoginHistory = (params?: LoginHistoryParams) => {
  return useQuery({
    queryKey: authKeys.loginHistory(params),
    queryFn: () => authService.getLoginHistory(params),
    staleTime: StaleTimeConfig.LONG,
  });
};

/**
 * 获取活跃会话
 */
export const useActiveSessions = () => {
  return useQuery({
    queryKey: authKeys.activeSessions(),
    queryFn: () => authService.getActiveSessions(),
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
  return useMutation<void, unknown, ChangePasswordDto>({
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
  return useMutation<void, unknown, ForgotPasswordDto>({
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
  return useQuery({
    queryKey: [...authKeys.all, 'verify-reset-token', token],
    queryFn: () => authService.verifyResetToken(token),
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

  return useMutation<void, unknown, ResetPasswordDto>({
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
 * 启用双因素认证
 */
export const useEnable2FA = () => {
  const queryClient = useQueryClient();

  return useMutation<{ qrCode: string; secret: string }, unknown, void>({
    mutationFn: () => authService.enable2FA(),
    onSuccess: () => {
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

  return useMutation<void, unknown, Disable2FADto>({
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

  return useMutation<void, unknown, string>({
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

  return useMutation<void, unknown, void>({
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
