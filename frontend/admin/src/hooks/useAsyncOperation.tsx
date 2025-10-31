import { useState, useCallback } from 'react';
import { message } from 'antd';
import { useErrorHandler } from './useErrorHandler';

export interface AsyncOperationOptions<T> {
  /**
   * 成功时显示的消息
   */
  successMessage?: string;

  /**
   * 错误上下文描述（如"创建设备"、"删除用户"）
   */
  errorContext?: string;

  /**
   * 成功回调
   */
  onSuccess?: (data: T) => void;

  /**
   * 错误回调
   */
  onError?: (error: Error) => void;

  /**
   * 完成回调（无论成功或失败）
   */
  onFinally?: () => void;

  /**
   * 是否在成功时显示提示（默认true）
   */
  showSuccessMessage?: boolean;

  /**
   * 是否在失败时显示提示（默认true）
   */
  showErrorMessage?: boolean;

  /**
   * 错误显示模式
   */
  errorDisplayMode?: 'notification' | 'modal';
}

/**
 * 通用异步操作Hook
 *
 * 功能：
 * 1. 统一处理loading状态
 * 2. 统一显示成功/失败消息
 * 3. 防止静默失败
 * 4. 提供一致的错误处理体验
 *
 * @example
 * ```tsx
 * const { execute, loading } = useAsyncOperation<Device>();
 *
 * const handleCreate = async (values: CreateDeviceDto) => {
 *   await execute(
 *     () => createDevice(values),
 *     {
 *       successMessage: '设备创建成功',
 *       errorContext: '创建设备',
 *       onSuccess: (device) => {
 *         form.resetFields();
 *         queryClient.invalidateQueries(['devices']);
 *       }
 *     }
 *   );
 * };
 * ```
 */
export function useAsyncOperation<T = any>() {
  const { handleError } = useErrorHandler();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 执行异步操作
   */
  const execute = useCallback(
    async (
      operation: () => Promise<T>,
      options: AsyncOperationOptions<T> = {}
    ): Promise<T | undefined> => {
      const {
        successMessage,
        errorContext = '操作',
        onSuccess,
        onError,
        onFinally,
        showSuccessMessage = true,
        showErrorMessage = true,
        errorDisplayMode = 'notification',
      } = options;

      setLoading(true);
      setError(null);

      try {
        const result = await operation();

        // 显示成功消息
        if (showSuccessMessage && successMessage) {
          message.success(successMessage);
        }

        // 调用成功回调
        onSuccess?.(result);

        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);

        // 显示错误消息
        if (showErrorMessage) {
          handleError(error, {
            customMessage: `${errorContext}失败`,
            displayMode: errorDisplayMode,
          });
        }

        // 调用错误回调
        onError?.(error);

        // 不再抛出错误，避免未捕获的promise rejection
        // 调用方可以通过检查返回值是否为undefined来判断操作是否成功
        return undefined;
      } finally {
        setLoading(false);
        onFinally?.();
      }
    },
    [handleError]
  );

  /**
   * 使用Promise风格执行操作（会抛出错误）
   */
  const executeWithThrow = useCallback(
    async (operation: () => Promise<T>, options: AsyncOperationOptions<T> = {}): Promise<T> => {
      const {
        successMessage,
        errorContext = '操作',
        onSuccess,
        onError,
        onFinally,
        showSuccessMessage = true,
        showErrorMessage = true,
        errorDisplayMode = 'notification',
      } = options;

      setLoading(true);
      setError(null);

      try {
        const result = await operation();

        // 显示成功消息
        if (showSuccessMessage && successMessage) {
          message.success(successMessage);
        }

        // 调用成功回调
        onSuccess?.(result);

        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);

        // 显示错误消息
        if (showErrorMessage) {
          handleError(error, {
            customMessage: `${errorContext}失败`,
            displayMode: errorDisplayMode,
          });
        }

        // 调用错误回调
        onError?.(error);

        // 重新抛出错误供调用方处理
        throw error;
      } finally {
        setLoading(false);
        onFinally?.();
      }
    },
    [handleError]
  );

  /**
   * 重置错误状态
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    execute,
    executeWithThrow,
    loading,
    error,
    resetError,
  };
}

/**
 * 包装Promise以自动处理错误
 *
 * @example
 * ```tsx
 * const result = await withErrorHandler(
 *   fetchData(),
 *   { customMessage: '加载数据失败' }
 * );
 * ```
 */
export async function withAsyncOperation<T>(
  promise: Promise<T>,
  options: {
    successMessage?: string;
    errorContext?: string;
    onError?: (error: Error) => void;
  } = {}
): Promise<T | undefined> {
  try {
    const result = await promise;
    if (options.successMessage) {
      message.success(options.successMessage);
    }
    return result;
  } catch (err) {
    const error = err as Error;
    const errorContext = options.errorContext || '操作';
    message.error(`${errorContext}失败: ${error.message}`);
    options.onError?.(error);
    return undefined;
  }
}
