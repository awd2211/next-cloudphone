/**
 * 认证服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { User, LoginDto, RegisterDto, CaptchaResponse } from '@/types';

// ========== 基础认证 ==========

/** 获取验证码 */
export const getCaptcha = () =>
  api.get<CaptchaResponse>('/auth/captcha');

/** 用户注册 */
export const register = (data: RegisterDto) =>
  api.post<User>('/auth/register', data);

/** 用户登录 */
export const login = (data: LoginDto) =>
  api.post<{ token: string; user: User }>('/auth/login', data);

/** 获取当前用户信息 */
export const getCurrentUser = () =>
  api.get<User>('/auth/me');

/** 退出登录 */
export const logout = () =>
  api.post<void>('/auth/logout');

// ========== 忘记密码/重置密码 ==========

export interface ForgotPasswordDto {
  type: 'email' | 'phone';
  email?: string;
  phone?: string;
}

/** 忘记密码 - 发送重置链接 */
export const forgotPassword = (data: ForgotPasswordDto) =>
  api.post<{ message: string }>('/auth/forgot-password', data);

export interface VerifyResetTokenResponse {
  valid: boolean;
  message?: string;
  userId?: string;
}

/** 验证重置密码 token */
export const verifyResetToken = (token: string) =>
  api.post<VerifyResetTokenResponse>('/auth/verify-reset-token', { token });

export interface ResetPasswordDto {
  token: string;
  password: string;
}

/** 重置密码 */
export const resetPassword = (data: ResetPasswordDto) =>
  api.post<{ message: string }>('/auth/reset-password', data);

// ========== 安全中心 ==========

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

/** 修改密码 */
export const changePassword = (data: ChangePasswordDto) =>
  api.post<{ message: string }>('/auth/change-password', data);

// ========== 双因素认证 ==========

export interface TwoFactorStatus {
  enabled: boolean;
  hasSecret: boolean;
}

/** 获取双因素认证状态 */
export const get2FAStatus = () =>
  api.get<TwoFactorStatus>('/auth/2fa/status');

/** 生成2FA密钥 */
export const generate2FA = () =>
  api.get<{ secret: string; qrCode: string; otpauthUrl: string }>('/auth/2fa/generate');

export interface Enable2FADto {
  token: string;
}

/** 启用双因素认证 */
export const enable2FA = (data: Enable2FADto) =>
  api.post<{ message: string }>('/auth/2fa/enable', data);

export interface Verify2FADto {
  code: string;
}

/** 验证双因素认证代码 */
export const verify2FACode = (data: Verify2FADto) =>
  api.post<void>('/auth/2fa/verify', data);

export interface Disable2FADto {
  token: string;
}

/** 禁用双因素认证 */
export const disable2FA = (data: Disable2FADto) =>
  api.post<{ message: string }>('/auth/2fa/disable', data);

// ========== 会话管理 ==========

export interface LoginHistoryParams {
  startDate?: string;
  endDate?: string;
  success?: boolean;
  page?: number;
  limit?: number;
}

export interface LoginHistoryRecord {
  id: string;
  result: string;
  ip: string;
  location: string;
  deviceType: string;
  browser: string;
  os: string;
  used2FA: boolean;
  createdAt: string;
}

/** 获取登录历史 */
export const getLoginHistory = (params?: LoginHistoryParams) =>
  api.get<{ data: LoginHistoryRecord[]; total: number; page: number; limit: number }>('/auth/login-history', { params });

export interface SessionInfo {
  id: string;
  deviceType: string;
  deviceName: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  isCurrent: boolean;
  lastActiveAt: string;
  createdAt: string;
}

/** 获取活跃会话 */
export const getActiveSessions = () =>
  api.get<SessionInfo[]>('/auth/sessions');

/** 终止单个会话 */
export const terminateSession = (sessionId: string, reason?: string) =>
  api.delete<{ message: string }>(`/auth/sessions/${sessionId}`, {
    data: reason ? { reason } : undefined,
  });

/** 终止所有其他会话 */
export const terminateAllSessions = () =>
  api.delete<{ message: string }>('/auth/sessions');
