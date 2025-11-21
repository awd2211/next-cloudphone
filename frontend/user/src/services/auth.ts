import request from '@/utils/request';
import type { User, LoginDto, RegisterDto, CaptchaResponse } from '@/types';

// 获取验证码
export const getCaptcha = () => {
  return request.get<CaptchaResponse>('/auth/captcha');
};

// 用户注册
export const register = (data: RegisterDto) => {
  return request.post<User>('/auth/register', data);
};

// 用户登录
export const login = (data: LoginDto) => {
  return request.post<{ token: string; user: User }>('/auth/login', data);
};

// 获取当前用户信息
export const getCurrentUser = () => {
  return request.get<User>('/auth/me');
};

// 退出登录
export const logout = () => {
  return request.post('/auth/logout');
};

// ========== 忘记密码/重置密码 相关 API ==========

/**
 * 忘记密码 - 发送重置链接
 */
export interface ForgotPasswordDto {
  type: 'email' | 'phone';
  email?: string;
  phone?: string;
}

export const forgotPassword = (data: ForgotPasswordDto) => {
  return request.post<{ message: string }>('/auth/forgot-password', data);
};

/**
 * 验证重置密码 token
 */
export interface VerifyResetTokenResponse {
  valid: boolean;
  message?: string;
  userId?: string;
}

export const verifyResetToken = (token: string) => {
  return request.post<VerifyResetTokenResponse>('/auth/verify-reset-token', { token });
};

/**
 * 重置密码
 */
export interface ResetPasswordDto {
  token: string;
  password: string;
}

export const resetPassword = (data: ResetPasswordDto) => {
  return request.post<{ message: string }>('/auth/reset-password', data);
};

// ========== 安全中心相关 API ==========

/**
 * 修改密码
 */
export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

export const changePassword = (data: ChangePasswordDto) => {
  return request.post<{ message: string }>('/auth/change-password', data);
};

/**
 * 获取双因素认证状态
 */
export interface TwoFactorStatus {
  enabled: boolean;
  hasSecret: boolean;
}

export const get2FAStatus = () => {
  return request.get<{ success: boolean; data: TwoFactorStatus }>('/auth/2fa/status');
};

/**
 * 生成2FA密钥
 */
export const generate2FA = () => {
  return request.get<{
    success: boolean;
    data: {
      secret: string;
      qrCode: string;
      otpauthUrl: string;
    };
  }>('/auth/2fa/generate');
};

/**
 * 启用双因素认证
 */
export interface Enable2FADto {
  token: string;
}

export const enable2FA = (data: Enable2FADto) => {
  return request.post<{ success: boolean; message: string }>('/auth/2fa/enable', data);
};

/**
 * 验证双因素认证代码
 */
export interface Verify2FADto {
  code: string;
}

export const verify2FACode = (data: Verify2FADto) => {
  return request.post('/auth/2fa/verify', data);
};

/**
 * 禁用双因素认证
 */
export interface Disable2FADto {
  token: string;
}

export const disable2FA = (data: Disable2FADto) => {
  return request.post<{ success: boolean; message: string }>('/auth/2fa/disable', data);
};

// ========== 会话管理相关 API ==========

/**
 * 登录历史查询参数
 */
export interface LoginHistoryParams {
  startDate?: string;
  endDate?: string;
  success?: boolean;
  page?: number;
  limit?: number;
}

/**
 * 登录历史记录
 */
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

/**
 * 获取登录历史
 */
export const getLoginHistory = (params?: LoginHistoryParams) => {
  return request.get<{
    data: LoginHistoryRecord[];
    total: number;
    page: number;
    limit: number;
  }>('/auth/login-history', { params });
};

/**
 * 会话信息
 */
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

/**
 * 获取活跃会话
 */
export const getActiveSessions = () => {
  return request.get<SessionInfo[]>('/auth/sessions');
};

/**
 * 终止单个会话
 */
export const terminateSession = (sessionId: string, reason?: string) => {
  return request.delete<{ success: boolean; message: string }>(`/auth/sessions/${sessionId}`, {
    data: reason ? { reason } : undefined,
  });
};

/**
 * 终止所有其他会话
 */
export const terminateAllSessions = () => {
  return request.delete<{ success: boolean; message: string }>('/auth/sessions');
};
