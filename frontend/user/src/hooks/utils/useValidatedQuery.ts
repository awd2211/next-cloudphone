/**
 * useValidatedQuery - 带 Zod 验证的 useQuery
 *
 * 结合 React Query 和 Zod,提供:
 * - 自动缓存管理
 * - 自动重试机制
 * - 运行时类型验证
 * - 类型安全的数据访问
 *
 * @example
 * ```typescript
 * const { data, isLoading, error } = useValidatedQuery({
 *   queryKey: ['devices'],
 *   queryFn: () => deviceService.getMyDevices(),
 *   schema: DevicesResponseSchema,
 * });
 * ```
 */

import { useQuery, type UseQueryOptions, type QueryKey } from '@tanstack/react-query';
import { z } from 'zod';
import { message } from 'antd';

interface UseValidatedQueryOptions<TData, TError = Error, TQueryKey extends QueryKey = QueryKey>
  extends Omit<UseQueryOptions<TData, TError, TData, TQueryKey>, 'queryFn'> {
  /**
   * 查询函数 (返回未验证的数据)
   */
  queryFn: () => Promise<unknown>;

  /**
   * Zod Schema (用于验证返回数据)
   */
  schema: z.ZodSchema<TData>;

  /**
   * 验证失败时是否显示错误提示
   * @default true
   */
  showValidationError?: boolean;

  /**
   * 是否在控制台打印验证错误详情
   * @default true in development
   */
  logValidationErrors?: boolean;
}

/**
 * 带 Zod 验证的 useQuery Hook
 *
 * 自动验证 API 响应,确保数据类型安全
 */
export function useValidatedQuery<TData, TQueryKey extends QueryKey = QueryKey>({
  queryFn,
  schema,
  showValidationError = true,
  logValidationErrors = import.meta.env.DEV,
  ...options
}: UseValidatedQueryOptions<TData, Error, TQueryKey>) {
  return useQuery<TData, Error, TData, TQueryKey>({
    ...options,
    queryFn: async () => {
      try {
        // 执行 API 请求
        const response = await queryFn();

        // Zod 验证
        const result = schema.safeParse(response);

        if (!result.success) {
          // 验证失败
          const validationError = new Error('API 响应数据格式验证失败');

          if (logValidationErrors) {
            console.error('❌ API 响应验证失败:', {
              queryKey: options.queryKey,
              response,
              errors: result.error.issues,
              schema: schema.description || 'Schema',
            });
          }

          if (showValidationError) {
            message.error('数据格式错误,请刷新页面重试');
          }

          throw validationError;
        }

        // 验证成功,返回类型安全的数据
        return result.data;
      } catch (error) {
        // 如果是验证错误,直接抛出
        if (error instanceof Error && error.message.includes('验证失败')) {
          throw error;
        }

        // 其他错误 (网络错误、API 错误等) 也抛出
        // React Query 会根据配置自动重试
        throw error;
      }
    },
  });
}
