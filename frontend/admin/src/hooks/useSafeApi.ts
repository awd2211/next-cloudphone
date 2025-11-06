/**
 * useSafeApi - 带运行时验证的安全API调用Hook
 *
 * 使用Zod schema验证API响应，防止运行时类型错误导致的崩溃
 *
 * @example
 * ```typescript
 * const { data, loading, error, execute } = useSafeApi(
 *   async () => getUsers({ page: 1, pageSize: 10 }),
 *   PaginatedUsersResponseSchema
 * );
 * ```
 */

import { useState, useCallback } from 'react';
import { message } from 'antd';
import { z } from 'zod';

interface UseSafeApiOptions {
  /**
   * 自动执行（组件挂载时）
   * @default false
   */
  immediate?: boolean;

  /**
   * 错误提示消息
   */
  errorMessage?: string;

  /**
   * 成功提示消息（可选）
   */
  successMessage?: string;

  /**
   * 验证失败时的默认值
   */
  fallbackValue?: any;

  /**
   * 是否在控制台打印验证错误详情
   * @default true in development
   */
  logValidationErrors?: boolean;
}

interface UseSafeApiResult<T> {
  /** API响应数据 (已验证) */
  data: T | null;

  /** 加载状态 */
  loading: boolean;

  /** 错误信息 */
  error: Error | null;

  /** 手动触发API调用 */
  execute: (...args: any[]) => Promise<T | null>;

  /** 重置状态 */
  reset: () => void;
}

/**
 * 安全的API调用Hook，带Zod运行时验证
 */
export function useSafeApi<T extends z.ZodTypeAny>(
  apiFunction: (...args: any[]) => Promise<unknown>,
  schema: T,
  options: UseSafeApiOptions = {}
): UseSafeApiResult<z.infer<T>> {
  const {
    immediate = false,
    errorMessage = '操作失败',
    successMessage,
    fallbackValue = null,
    logValidationErrors = process.env.NODE_ENV === 'development',
  } = options;

  const [data, setData] = useState<z.infer<T> | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: any[]): Promise<z.infer<T> | null> => {
      setLoading(true);
      setError(null);

      try {
        // 调用API
        const response = await apiFunction(...args);

        // 使用Zod验证响应
        const validationResult = schema.safeParse(response);

        if (!validationResult.success) {
          // 验证失败
          const validationError = new Error('API响应验证失败');

          if (logValidationErrors) {
            console.error('❌ API响应验证失败:', {
              response,
              errors: validationResult.error.issues,
              schema: schema.description || 'Schema',
            });
          }

          setError(validationError);
          setData(fallbackValue);
          message.error(`${errorMessage}: 数据格式错误`);

          return fallbackValue;
        }

        // 验证成功
        const validatedData = validationResult.data;
        setData(validatedData);

        if (successMessage) {
          message.success(successMessage);
        }

        return validatedData;
      } catch (err) {
        // API调用失败
        const apiError = err instanceof Error ? err : new Error(String(err));
        setError(apiError);
        setData(fallbackValue);
        message.error(errorMessage);

        if (logValidationErrors) {
          console.error('❌ API调用失败:', apiError);
        }

        return fallbackValue;
      } finally {
        setLoading(false);
      }
    },
    [apiFunction, schema, errorMessage, successMessage, fallbackValue, logValidationErrors]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  // 自动执行
  // useEffect(() => {
  //   if (immediate) {
  //     execute();
  //   }
  // }, [immediate, execute]);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}

/**
 * 辅助函数：将可能为null/undefined的值转换为空数组
 * 用于确保Table等组件始终接收数组
 */
export function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/**
 * 辅助函数：安全地访问嵌套对象属性
 */
export function safeGet<T>(obj: any, path: string, defaultValue: T): T {
  const keys = path.split('.');
  let result = obj;

  for (const key of keys) {
    if (result == null) {
      return defaultValue;
    }
    result = result[key];
  }

  return result ?? defaultValue;
}
