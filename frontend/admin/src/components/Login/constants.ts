/**
 * 登录相关常量
 */

import type { ErrorInfo } from '@/components/ErrorAlert';

/**
 * 登录错误恢复建议
 */
export const LOGIN_ERROR_SUGGESTIONS = [
  {
    action: '检查用户名密码',
    description: '请确认用户名和密码是否正确',
  },
  {
    action: '刷新验证码',
    description: '验证码可能已过期，请点击验证码图片刷新',
  },
  {
    action: '联系管理员',
    description: '如果多次尝试失败，请联系系统管理员',
    actionUrl: '/support',
  },
];

/**
 * 2FA 错误恢复建议
 */
export const TWO_FACTOR_ERROR_SUGGESTIONS = [
  {
    action: '重新输入',
    description: '请确认输入的6位验证码是否正确',
  },
  {
    action: '同步时间',
    description: '验证器应用依赖设备时间，请确保设备时间准确',
  },
  {
    action: '联系管理员',
    description: '如无法登录，请联系系统管理员重置双因素认证',
    actionUrl: '/support',
  },
];

/**
 * 解析登录错误
 */
export const parseLoginError = (error: any): ErrorInfo => {
  const response = error.response?.data;
  return {
    message: response?.message || '登录失败',
    userMessage: response?.userMessage || '登录失败，请检查用户名和密码',
    code: response?.errorCode || error.response?.status?.toString(),
    requestId: response?.requestId,
    recoverySuggestions: response?.recoverySuggestions || LOGIN_ERROR_SUGGESTIONS,
    retryable: true,
  };
};

/**
 * 解析 2FA 错误
 */
export const parseTwoFactorError = (error: any): ErrorInfo => {
  const response = error.response?.data;
  return {
    message: response?.message || '验证码错误',
    userMessage: response?.userMessage || '验证码错误，请检查您的验证器应用',
    code: response?.errorCode || error.response?.status?.toString(),
    requestId: response?.requestId,
    recoverySuggestions: response?.recoverySuggestions || TWO_FACTOR_ERROR_SUGGESTIONS,
    retryable: true,
  };
};
