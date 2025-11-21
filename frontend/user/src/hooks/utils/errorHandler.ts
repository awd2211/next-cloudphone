/**
 * 统一的错误处理工具
 * 用于 React Query hooks 中的标准错误处理
 */

import { message } from 'antd';
import type { AxiosError } from 'axios';

/**
 * API 错误响应接口
 */
export interface ApiError {
  message: string;
  statusCode?: number;
  error?: string;
  details?: any;
}

/**
 * 从错误对象中提取错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (!error) {
    return '未知错误';
  }

  // Axios 错误
  if (isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;
    return apiError?.message || error.message || '请求失败';
  }

  // 普通 Error 对象
  if (error instanceof Error) {
    return error.message;
  }

  // 字符串错误
  if (typeof error === 'string') {
    return error;
  }

  // 其他类型
  return '未知错误';
}

/**
 * 检查是否为 Axios 错误
 */
function isAxiosError(error: unknown): error is AxiosError {
  return (error as AxiosError).isAxiosError === true;
}

/**
 * 标准的错误处理函数
 * 在 useMutation 的 onError 中使用
 */
export function handleMutationError(error: unknown, customMessage?: string) {
  const errorMsg = getErrorMessage(error);
  message.error(customMessage || errorMsg);
}

/**
 * 标准的成功处理函数
 * 在 useMutation 的 onSuccess 中使用
 */
export function handleMutationSuccess(successMessage: string) {
  message.success(successMessage);
}

/**
 * 根据 HTTP 状态码返回错误消息
 */
export function getErrorMessageByStatus(status: number): string {
  const statusMessages: Record<number, string> = {
    400: '请求参数错误',
    401: '未授权，请重新登录',
    403: '没有权限访问',
    404: '请求的资源不存在',
    408: '请求超时',
    500: '服务器内部错误',
    502: '网关错误',
    503: '服务暂时不可用',
    504: '网关超时',
  };

  return statusMessages[status] || `请求失败 (${status})`;
}

/**
 * 错误重试判断
 * 用于 React Query 的 retry 配置
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  // 最多重试 3 次
  if (failureCount >= 3) {
    return false;
  }

  // 不重试的状态码
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status && [400, 401, 403, 404, 422].includes(status)) {
      return false;
    }
  }

  return true;
}
