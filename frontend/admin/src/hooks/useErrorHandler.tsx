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
  /**
   * 错误显示模式
   */
  displayMode?: 'notification' | 'modal';
  /**
   * 操作上下文（用于日志和错误报告）
   */
  context?: string;
  /**
   * 是否显示重试按钮
   */
  showRetry?: boolean;
  /**
   * 重试回调
   */
  onRetry?: () => void;
}

interface ApiError {
  code?: string;
  message: string;
  details?: string;
  statusCode?: number;
  requestId?: string;
  /**
   * 用户友好的错误消息
   */
  userMessage?: string;
  /**
   * 技术详情（仅供开发和调试）
   */
  technicalMessage?: string;
  /**
   * 恢复建议
   */
  recoverySuggestions?: Array<{
    action: string;
    description: string;
    actionUrl?: string;
  }>;
  /**
   * 文档链接
   */
  documentationUrl?: string;
  /**
   * 支持链接
   */
  supportUrl?: string;
  /**
   * 是否可重试
   */
  retryable?: boolean;
}

/**
 * 解析 Axios 错误
 */
function parseAxiosError(error: AxiosError): ApiError {
  if (error.response) {
    const { status, data } = error.response;
    const errorData = data as any;

    return {
      code: errorData?.errorCode || errorData?.code || `HTTP_${status}`,
      message: errorData?.message || error.message,
      userMessage: errorData?.userMessage,
      technicalMessage: errorData?.technicalMessage || errorData?.message,
      details: errorData?.details,
      statusCode: status,
      requestId: errorData?.requestId || error.response?.headers?.['x-request-id'],
      recoverySuggestions: errorData?.recoverySuggestions,
      documentationUrl: errorData?.documentationUrl,
      supportUrl: errorData?.supportUrl,
      retryable: errorData?.retryable,
    };
  }

  if (error.request) {
    return {
      code: 'NETWORK_ERROR',
      message: '网络连接失败，请检查网络设置',
      userMessage: '网络连接失败',
      technicalMessage: 'Network request failed - no response received',
      statusCode: 0,
      retryable: true,
      recoverySuggestions: [
        {
          action: '检查网络连接',
          description: '请确保您的设备已连接到互联网',
        },
        {
          action: '刷新页面',
          description: '尝试刷新页面重新加载',
        },
      ],
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error.message || '未知错误',
    userMessage: '发生未知错误',
    technicalMessage: error.message || 'Unknown error occurred',
  };
}

/**
 * 根据错误代码获取友好的错误消息
 */
function getFriendlyErrorMessage(error: ApiError): string {
  const messageMap: Record<string, string> = {
    NETWORK_ERROR: '网络连接失败，请检查您的网络设置',
    TIMEOUT: '请求超时，请稍后重试',
    UNAUTHORIZED: '登录已过期，请重新登录',
    FORBIDDEN: '您没有权限执行此操作',
    NOT_FOUND: '请求的资源不存在',
    VALIDATION_ERROR: '数据验证失败，请检查输入',
    SERVER_ERROR: '服务器错误，请稍后重试',
    QUOTA_EXCEEDED: '配额已用完，请升级套餐',
    HTTP_400: '请求参数错误',
    HTTP_401: '未授权，请登录',
    HTTP_403: '没有权限访问',
    HTTP_404: '资源不存在',
    HTTP_422: '数据验证失败',
    HTTP_429: '请求过于频繁，请稍后再试',
    HTTP_500: '服务器内部错误',
    HTTP_502: '网关错误',
    HTTP_503: '服务暂时不可用',
    HTTP_504: '网关超时',
  };

  return (error.code && messageMap[error.code]) || error.message || '未知错误';
}

/**
 * 上报错误到服务器
 */
async function reportErrorToServer(error: ApiError, context?: string) {
  try {
    const userId = localStorage.getItem('userId');

    const errorLog = {
      code: error.code,
      message: error.message,
      userMessage: error.userMessage,
      technicalMessage: error.technicalMessage,
      details: error.details,
      statusCode: error.statusCode,
      requestId: error.requestId,
      context,
      userId,
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
    (error: Error | AxiosError | string, options: ErrorOptions = {}) => {
      const {
        showNotification = true,
        showModal = false,
        displayMode,
        logToConsole = true,
        reportToServer = process.env.NODE_ENV === 'production',
        customMessage,
        context,
        showRetry = false,
        onRetry,
      } = options;

      // 解析错误
      let apiError: ApiError;
      if (typeof error === 'string') {
        apiError = { message: error, userMessage: error };
      } else if ('isAxiosError' in error && error.isAxiosError) {
        apiError = parseAxiosError(error as AxiosError);
      } else {
        apiError = {
          message: (error as Error).message,
          userMessage: (error as Error).message,
          technicalMessage: (error as Error).message,
        };
      }

      // 获取友好的错误消息（优先使用userMessage，然后是customMessage，最后是映射的消息）
      const friendlyMessage =
        customMessage || apiError.userMessage || getFriendlyErrorMessage(apiError);

      // 控制台日志
      if (logToConsole) {
        console.error('Error handled:', {
          original: error,
          parsed: apiError,
          friendly: friendlyMessage,
          context,
          requestId: apiError.requestId,
        });
      }

      // 根据displayMode决定显示方式
      const shouldShowModal = displayMode === 'modal' || showModal;
      const shouldShowNotification =
        displayMode === 'notification' || (showNotification && !shouldShowModal);

      // 显示通知
      if (shouldShowNotification) {
        const messageKey = `error-${Date.now()}`;

        message.error({
          content: (
            <div>
              <div>{friendlyMessage}</div>
              {apiError.requestId && (
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  Request ID: {apiError.requestId}
                </div>
              )}
              {(showRetry || apiError.retryable) && onRetry && (
                <div style={{ marginTop: 8 }}>
                  <a
                    onClick={() => {
                      message.destroy(messageKey);
                      onRetry();
                    }}
                  >
                    点击重试
                  </a>
                </div>
              )}
            </div>
          ),
          duration: 5,
          key: messageKey,
        });
      }

      // 显示模态框
      if (shouldShowModal) {
        Modal.error({
          title: '操作失败',
          content: (
            <div>
              <p style={{ fontSize: 14, marginBottom: 16 }}>{friendlyMessage}</p>

              {/* 恢复建议 */}
              {apiError.recoverySuggestions && apiError.recoverySuggestions.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 8 }}>解决方案：</div>
                  <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                    {apiError.recoverySuggestions.map((suggestion, index) => (
                      <li key={index} style={{ marginBottom: 4 }}>
                        <strong>{suggestion.action}:</strong> {suggestion.description}
                        {suggestion.actionUrl && (
                          <span>
                            {' '}
                            <a
                              href={suggestion.actionUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              前往 →
                            </a>
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 技术详情 */}
              {apiError.details && (
                <details style={{ marginBottom: 8 }}>
                  <summary style={{ cursor: 'pointer', color: '#666', fontSize: 12 }}>
                    查看技术详情
                  </summary>
                  <pre
                    style={{
                      fontSize: 11,
                      marginTop: 8,
                      overflow: 'auto',
                      background: '#f5f5f5',
                      padding: 8,
                      borderRadius: 4,
                    }}
                  >
                    {apiError.details}
                  </pre>
                </details>
              )}

              {/* Request ID */}
              {apiError.requestId && (
                <p style={{ marginBottom: 4, color: '#999', fontSize: 12 }}>
                  Request ID: <code>{apiError.requestId}</code>
                </p>
              )}

              {/* 错误代码 */}
              {apiError.code && (
                <p style={{ marginBottom: 4, color: '#999', fontSize: 12 }}>
                  错误代码: {apiError.code}
                </p>
              )}

              {/* 文档和支持链接 */}
              {(apiError.documentationUrl || apiError.supportUrl) && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                  {apiError.documentationUrl && (
                    <a
                      href={apiError.documentationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ marginRight: 16 }}
                    >
                      查看文档
                    </a>
                  )}
                  {apiError.supportUrl && (
                    <a href={apiError.supportUrl} target="_blank" rel="noopener noreferrer">
                      联系技术支持
                    </a>
                  )}
                </div>
              )}
            </div>
          ),
          okText: (showRetry || apiError.retryable) && onRetry ? '重试' : '我知道了',
          onOk: () => {
            if ((showRetry || apiError.retryable) && onRetry) {
              onRetry();
            }
          },
        });
      }

      // 上报到服务器
      if (reportToServer) {
        reportErrorToServer(apiError, context).catch(() => {
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
    async <T,>(promise: Promise<T>, options?: ErrorOptions): Promise<T | null> => {
      try {
        return await promise;
      } catch (_error) {
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
    <T extends (...args: any[]) => any>(fn: T, options?: ErrorOptions): T => {
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
        } catch (_error) {
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
 * } catch (_error) {
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
