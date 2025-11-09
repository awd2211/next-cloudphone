/**
 * 错误处理工具
 *
 * 提供统一的错误处理、错误分类、错误上报等功能
 */

import React from 'react';
import { message, notification } from 'antd';
import { AxiosError } from 'axios';

/**
 * 错误类型
 */
export enum ErrorType {
  /** 网络错误（连接失败、超时等） */
  NETWORK = 'NETWORK',
  /** 认证错误（未登录、token 过期等） */
  AUTH = 'AUTH',
  /** 权限错误（无权访问） */
  PERMISSION = 'PERMISSION',
  /** 业务错误（API 返回的业务错误） */
  BUSINESS = 'BUSINESS',
  /** 验证错误（表单验证失败） */
  VALIDATION = 'VALIDATION',
  /** 服务器错误（5xx） */
  SERVER = 'SERVER',
  /** 未知错误 */
  UNKNOWN = 'UNKNOWN',
}

/**
 * 标准化错误对象
 */
export interface AppError {
  /** 错误类型 */
  type: ErrorType;
  /** 错误消息（用户可读） */
  message: string;
  /** 错误代码 */
  code?: string | number;
  /** 详细错误信息（开发用） */
  details?: unknown;
  /** HTTP 状态码 */
  statusCode?: number;
  /** 是否可重试 */
  retryable: boolean;
  /** 原始错误 */
  originalError?: unknown;
}

/**
 * 错误消息映射
 */
const ERROR_MESSAGES: Record<string, string> = {
  // 网络错误
  NETWORK_ERROR: '网络连接失败，请检查网络后重试',
  TIMEOUT: '请求超时，请稍后重试',
  CORS_ERROR: '跨域请求失败',

  // 认证错误
  UNAUTHORIZED: '登录已过期，请重新登录',
  TOKEN_EXPIRED: '登录凭证已过期，请重新登录',
  INVALID_TOKEN: '登录凭证无效，请重新登录',

  // 权限错误
  FORBIDDEN: '您没有权限执行此操作',
  PERMISSION_DENIED: '权限不足，请联系管理员',

  // 业务错误
  NOT_FOUND: '请求的资源不存在',
  CONFLICT: '操作冲突，请刷新后重试',
  VALIDATION_FAILED: '数据验证失败',

  // 服务器错误
  INTERNAL_SERVER_ERROR: '服务器错误，请稍后重试',
  SERVICE_UNAVAILABLE: '服务暂时不可用，请稍后重试',
  GATEWAY_TIMEOUT: '服务响应超时，请稍后重试',

  // 默认
  DEFAULT: '操作失败，请稍后重试',
};

/**
 * 判断错误类型
 */
export function classifyError(error: unknown): ErrorType {
  if (!error) return ErrorType.UNKNOWN;

  // Axios 错误
  if (isAxiosError(error)) {
    const statusCode = error.response?.status;

    if (!statusCode) {
      return ErrorType.NETWORK;
    }

    if (statusCode === 401) {
      return ErrorType.AUTH;
    }

    if (statusCode === 403) {
      return ErrorType.PERMISSION;
    }

    if (statusCode === 422 || statusCode === 400) {
      return ErrorType.VALIDATION;
    }

    if (statusCode >= 500) {
      return ErrorType.SERVER;
    }

    return ErrorType.BUSINESS;
  }

  // 其他错误类型
  if (error instanceof Error) {
    if (error.message.includes('Network')) {
      return ErrorType.NETWORK;
    }
    if (error.message.includes('timeout')) {
      return ErrorType.NETWORK;
    }
  }

  return ErrorType.UNKNOWN;
}

/**
 * 判断是否为 Axios 错误
 */
function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

/**
 * 标准化错误对象
 */
export function normalizeError(error: unknown): AppError {
  const type = classifyError(error);

  // Axios 错误
  if (isAxiosError(error)) {
    const statusCode = error.response?.status;
    const errorData = error.response?.data as {
      message?: string;
      code?: string | number;
      errors?: unknown;
    };

    return {
      type,
      message: errorData?.message || getErrorMessage(type, statusCode),
      code: errorData?.code || statusCode,
      details: errorData?.errors || error.response?.data,
      statusCode,
      retryable: isRetryable(type, statusCode),
      originalError: error,
    };
  }

  // 标准 Error 对象
  if (error instanceof Error) {
    return {
      type,
      message: error.message || getErrorMessage(type),
      retryable: isRetryable(type),
      originalError: error,
    };
  }

  // 字符串错误
  if (typeof error === 'string') {
    return {
      type,
      message: error,
      retryable: false,
      originalError: error,
    };
  }

  // 未知错误
  return {
    type: ErrorType.UNKNOWN,
    message: getErrorMessage(ErrorType.UNKNOWN),
    retryable: false,
    originalError: error,
  };
}

/**
 * 获取错误消息
 */
function getErrorMessage(type: ErrorType, statusCode?: number): string {
  if (statusCode) {
    switch (statusCode) {
      case 401:
        return ERROR_MESSAGES.UNAUTHORIZED;
      case 403:
        return ERROR_MESSAGES.FORBIDDEN;
      case 404:
        return ERROR_MESSAGES.NOT_FOUND;
      case 409:
        return ERROR_MESSAGES.CONFLICT;
      case 422:
      case 400:
        return ERROR_MESSAGES.VALIDATION_FAILED;
      case 500:
        return ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
      case 503:
        return ERROR_MESSAGES.SERVICE_UNAVAILABLE;
      case 504:
        return ERROR_MESSAGES.GATEWAY_TIMEOUT;
    }
  }

  switch (type) {
    case ErrorType.NETWORK:
      return ERROR_MESSAGES.NETWORK_ERROR;
    case ErrorType.AUTH:
      return ERROR_MESSAGES.UNAUTHORIZED;
    case ErrorType.PERMISSION:
      return ERROR_MESSAGES.FORBIDDEN;
    case ErrorType.SERVER:
      return ERROR_MESSAGES.INTERNAL_SERVER_ERROR;
    default:
      return ERROR_MESSAGES.DEFAULT;
  }
}

/**
 * 判断错误是否可重试
 */
function isRetryable(type: ErrorType, statusCode?: number): boolean {
  // 网络错误、服务器错误、超时错误可重试
  if (type === ErrorType.NETWORK || type === ErrorType.SERVER) {
    return true;
  }

  // 503, 504 可重试
  if (statusCode === 503 || statusCode === 504) {
    return true;
  }

  // 认证、权限、验证错误不可重试
  if (
    type === ErrorType.AUTH ||
    type === ErrorType.PERMISSION ||
    type === ErrorType.VALIDATION
  ) {
    return false;
  }

  return false;
}

/**
 * 错误处理配置
 */
export interface ErrorHandlerConfig {
  /** 是否显示错误提示 */
  showMessage?: boolean;
  /** 消息类型：'message' | 'notification' */
  messageType?: 'message' | 'notification';
  /** 是否记录错误日志 */
  log?: boolean;
  /** 是否上报错误 */
  report?: boolean;
  /** 自定义错误消息 */
  customMessage?: string;
  /** 错误回调 */
  onError?: (error: AppError) => void;
}

/**
 * 统一错误处理
 */
export function handleError(error: unknown, config: ErrorHandlerConfig = {}): AppError {
  const {
    showMessage: shouldShowMessage = true,
    messageType = 'message',
    log = true,
    report = import.meta.env.PROD, // 生产环境上报
    customMessage,
    onError,
  } = config;

  // 标准化错误
  const appError = normalizeError(error);

  // 控制台日志
  if (log) {
    console.error('[ErrorHandler]', {
      type: appError.type,
      message: appError.message,
      code: appError.code,
      details: appError.details,
      originalError: appError.originalError,
    });
  }

  // 显示错误提示
  if (shouldShowMessage) {
    const errorMessage = customMessage || appError.message;

    if (messageType === 'notification') {
      notification.error({
        message: '错误',
        description: errorMessage,
        duration: 4.5,
        ...(appError.retryable && {
          btn: React.createElement(
            'button',
            {
              onClick: () => {
                notification.destroy();
                // 触发重试回调（需要在调用处处理）
              },
            },
            '重试'
          ),
        }),
      });
    } else {
      message.error(errorMessage);
    }
  }

  // 上报错误（生产环境）
  if (report) {
    reportError(appError);
  }

  // 特殊处理认证错误
  if (appError.type === ErrorType.AUTH) {
    handleAuthError();
  }

  // 执行错误回调
  if (onError) {
    onError(appError);
  }

  return appError;
}

/**
 * 上报错误到监控系统
 */
function reportError(error: AppError): void {
  // TODO: 集成错误监控系统（如 Sentry）
  try {
    // 示例：发送到错误监控服务
    // sentry.captureException(error.originalError, {
    //   tags: { type: error.type, code: error.code },
    //   extra: { details: error.details },
    // });

    console.log('[ErrorReporter] 错误已上报', error);
  } catch (err) {
    console.error('[ErrorReporter] 上报失败', err);
  }
}

/**
 * 处理认证错误
 */
function handleAuthError(): void {
  // 清除本地存储的认证信息
  localStorage.removeItem('token');
  localStorage.removeItem('user');

  // 延迟跳转到登录页，给用户看到错误提示
  setTimeout(() => {
    window.location.href = '/login';
  }, 1500);
}

/**
 * 创建错误处理器（高阶函数）
 */
export function createErrorHandler(defaultConfig: ErrorHandlerConfig = {}) {
  return (error: unknown, config: ErrorHandlerConfig = {}) => {
    return handleError(error, { ...defaultConfig, ...config });
  };
}

/**
 * React Query 错误处理器
 */
export const queryErrorHandler = (error: unknown) => {
  handleError(error, {
    messageType: 'message',
    log: true,
    report: true,
  });
};

/**
 * 表单提交错误处理器
 */
export const formSubmitErrorHandler = (error: unknown) => {
  const appError = handleError(error, {
    messageType: 'notification',
    log: true,
  });

  // 如果是验证错误，返回字段错误
  if (appError.type === ErrorType.VALIDATION && appError.details) {
    return appError.details;
  }

  return null;
};
