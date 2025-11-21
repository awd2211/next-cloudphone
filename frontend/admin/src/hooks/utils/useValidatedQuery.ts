/**
 * useValidatedQuery - React Query + Zod 验证的统一封装
 *
 * 结合 React Query 的强大功能和 Zod 的运行时验证
 *
 * @example
 * ```typescript
 * const { data, isLoading } = useValidatedQuery({
 *   queryKey: ['users'],
 *   queryFn: getUsers,
 *   schema: UsersResponseSchema,
 * });
 * ```
 */

import { useQuery, useMutation as useReactQueryMutation, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import { message } from 'antd';
import { z } from 'zod';

export interface UseValidatedQueryOptions<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
> extends Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryFn'> {
  /**
   * API 调用函数
   */
  queryFn: (...args: any[]) => Promise<unknown>;

  /**
   * Zod Schema 用于验证响应
   */
  schema: z.ZodType<TQueryFnData>;

  /**
   * 验证失败时的错误消息
   * @default '数据格式错误'
   */
  validationErrorMessage?: string;

  /**
   * API 调用失败时的错误消息
   * @default '加载失败，请稍后重试'
   */
  apiErrorMessage?: string;

  /**
   * 是否在控制台打印验证错误详情
   * @default true in development
   */
  logValidationErrors?: boolean;

  /**
   * 验证失败时的 fallback 值
   */
  fallbackValue?: TQueryFnData;
}

/**
 * React Query + Zod 验证的统一封装
 *
 * ✅ 优势:
 * - 自动缓存和去重 (React Query)
 * - 运行时类型验证 (Zod)
 * - 统一的错误处理
 * - 完整的 TypeScript 类型推导
 */
export function useValidatedQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  options: UseValidatedQueryOptions<TQueryFnData, TError, TData, TQueryKey>
) {
  const {
    queryFn,
    schema,
    validationErrorMessage = '数据格式错误',
    apiErrorMessage = '加载失败，请稍后重试',
    logValidationErrors = process.env.NODE_ENV === 'development',
    fallbackValue,
    ...queryOptions
  } = options;

  return useQuery<TQueryFnData, TError, TData, TQueryKey>({
    ...queryOptions,
    queryFn: async (context) => {
      try {
        // 1. 调用 API
        const response = await queryFn(context);

        // 2. Zod 验证
        const validationResult = schema.safeParse(response);

        if (!validationResult.success) {
          // 验证失败
          if (logValidationErrors) {
            console.error('❌ API响应验证失败:', {
              response,
              errors: validationResult.error.issues,
              schema: schema.description || 'Schema',
            });
          }

          // 抛出验证错误
          const error = new Error(validationErrorMessage);
          (error as any).validationErrors = validationResult.error.issues;
          (error as any).isValidationError = true;
          throw error;
        }

        // 3. 返回验证后的数据
        return validationResult.data;
      } catch (_error) {
        // 区分验证错误和 API 错误
        if ((error as any).isValidationError) {
          message.error(validationErrorMessage);
        } else {
          message.error(apiErrorMessage);
        }
        throw error;
      }
    },
    // 如果提供了 fallbackValue，在错误时使用
    placeholderData: fallbackValue as any,
  });
}

/**
 * useMutation 的验证版本
 */
export function useValidatedMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown,
>(options: {
  mutationFn: (variables: TVariables) => Promise<unknown>;
  schema: z.ZodType<TData>;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;
  onError?: (error: TError, variables: TVariables, context: TContext | undefined) => void;
}) {
  const {
    mutationFn,
    schema,
    successMessage,
    errorMessage = '操作失败',
    onSuccess,
    onError,
  } = options;

  return useReactQueryMutation<TData, TError, TVariables, TContext>({
    mutationFn: async (variables: TVariables) => {
      const response = await mutationFn(variables);
      const validationResult = schema.safeParse(response);

      if (!validationResult.success) {
        console.error('❌ Mutation响应验证失败:', validationResult.error.issues);
        throw new Error('响应数据格式错误');
      }

      return validationResult.data;
    },
    onSuccess: (data: TData, variables: TVariables, context: TContext) => {
      if (successMessage) {
        message.success(successMessage);
      }
      onSuccess?.(data, variables, context);
    },
    onError: (error: TError, variables: TVariables, context: TContext | undefined) => {
      message.error(errorMessage);
      onError?.(error, variables, context);
    },
  });
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
