/**
 * 全局错误处理 Hook
 * 统一处理和展示错误
 */

import { useCallback } from 'react';
import { message, Modal } from 'antd';
import type { AxiosError } from 'axios';

export interface ErrorOptions {
  showNotification?: boolean;
  showModal?: boolean;
  logToConsole?: boolean;
  reportToServer?: boolean;
  customMessage?: string;
}

interface ApiError {
  code?: string;
  message: string;
  details?: string;
  statusCode?: number;
}

/**
 * 解析 Axios 错误
 */
function parseAxiosError(error: AxiosError): ApiError {
  if (error.response) {
    const { status, data } = error.response;
    const errorData = data as any;

    return {
      code: errorData?.code || `HTTP_${status}`,
      message: errorData?.message || error.message,
      details: errorData?.details,
      statusCode: status,
    };
  }

  if (error.request) {
    return {
      code: 'NETWORK_ERROR',
      message: '网络连接失败，请检查网络设置',
      statusCode: 0,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || '未知错误',
  };
}

/**
 * 根据错误代码获取友好的错误消息
 */
function getFriendlyErrorMessage(error: ApiError): string {
  const messageMap: Record<string, string> = {
    'NETWORK_ERROR': '网络连接失败，请检查您的网络设置',
    'TIMEOUT': '请求超时，请稍后重试',
    'UNAUTHORIZED': '登录已过期，请重新登录',
    'FORBIDDEN': '您没有权限执行此操作',
    'NOT_FOUND': '请求的资源不存在',
    'VALIDATION_ERROR': '数据验证失败，请检查输入',
    'SERVER_ERROR': '服务器错误，请稍后重试',
    'QUOTA_EXCEEDED': '配额已用完，请升级套餐',
    'HTTP_400': '请求参数错误',
    'HTTP_401': '未授权，请登录',
    'HTTP_403': '没有权限访问',
    'HTTP_404': '资源不存在',
    'HTTP_422': '数据验证失败',
    'HTTP_429': '请求过于频繁，请稍后再试',
    'HTTP_500': '服务器内部错误',
    'HTTP_502': '网关错误',
    'HTTP_503': '服务暂时不可用',
    'HTTP_504': '网关超时',
  };

  return error.code && messageMap[error.code]
    ? messageMap[error.code]
    : error.message;
}

/**
 * 上报错误到服务器
 */
async function reportErrorToServer(error: ApiError, context?: string) {
  try {
    const errorLog = {
      code: error.code,
      message: error.message,
      details: error.details,
      statusCode: error.statusCode,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    };

    // 使用原生 fetch 避免循环依赖
    await fetch(`${import.meta.env.VITE_API_BASE_URL}/logs/frontend-errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(errorLog),
    });
  } catch (err) {
    // 静默失败
    console.error('Failed to report error:', err);
  }
}

/**
 * 错误处理 Hook
 */
export function useErrorHandler() {
  /**
   * 处理错误
   */
  const handleError = useCallback(
    (
      error: Error | AxiosError | string,
      options: ErrorOptions = {}
    ) => {
      const {
        showNotification = true,
        showModal = false,
        logToConsole = true,
        reportToServer = process.env.NODE_ENV === 'production',
        customMessage,
      } = options;

      // 解析错误
      let apiError: ApiError;
      if (typeof error === 'string') {
        apiError = { message: error };
      } else if ('isAxiosError' in error && error.isAxiosError) {
        apiError = parseAxiosError(error as AxiosError);
      } else {
        apiError = {
          message: (error as Error).message,
        };
      }

      // 获取友好的错误消息
      const friendlyMessage = customMessage || getFriendlyErrorMessage(apiError);

      // 控制台日志
      if (logToConsole) {
        console.error('Error handled:', {
          original: error,
          parsed: apiError,
          friendly: friendlyMessage,
        });
      }

      // 显示通知
      if (showNotification && !showModal) {
        message.error({
          content: friendlyMessage,
          duration: 5,
        });
      }

      // 显示模态框
      if (showModal) {
        Modal.error({
          title: '操作失败',
          content: (
            <div>
              <p>{friendlyMessage}</p>
              {apiError.details && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', color: '#666' }}>
                    查看详细信息
                  </summary>
                  <pre style={{ fontSize: 12, marginTop: 8, overflow: 'auto' }}>
                    {apiError.details}
                  </pre>
                </details>
              )}
              {apiError.code && (
                <p style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                  错误代码: {apiError.code}
                </p>
              )}
            </div>
          ),
          okText: '我知道了',
        });
      }

      // 上报到服务器
      if (reportToServer) {
        reportErrorToServer(apiError).catch(() => {
          // 静默失败
        });
      }

      return apiError;
    },
    []
  );

  /**
   * 处理 Promise 错误
   */
  const handlePromiseError = useCallback(
    async <T,>(
      promise: Promise<T>,
      options?: ErrorOptions
    ): Promise<T | null> => {
      try {
        return await promise;
      } catch (error) {
        handleError(error as Error, options);
        return null;
      }
    },
    [handleError]
  );

  /**
   * 创建错误处理的包装器
   */
  const withErrorHandler = useCallback(
    <T extends (...args: any[]) => any>(
      fn: T,
      options?: ErrorOptions
    ): T => {
      return ((...args: any[]) => {
        try {
          const result = fn(...args);
          if (result instanceof Promise) {
            return result.catch((error) => {
              handleError(error, options);
              throw error;
            });
          }
          return result;
        } catch (error) {
          handleError(error as Error, options);
          throw error;
        }
      }) as T;
    },
    [handleError]
  );

  return {
    handleError,
    handlePromiseError,
    withErrorHandler,
  };
}

/**
 * 使用示例：
 *
 * const { handleError, handlePromiseError, withErrorHandler } = useErrorHandler();
 *
 * // 1. 直接处理错误
 * try {
 *   await someOperation();
 * } catch (error) {
 *   handleError(error, { showModal: true });
 * }
 *
 * // 2. Promise 错误处理
 * const result = await handlePromiseError(
 *   fetchData(),
 *   { customMessage: '加载数据失败' }
 * );
 *
 * // 3. 包装函数
 * const safeLoadData = withErrorHandler(
 *   loadData,
 *   { showNotification: true }
 * );
 */
