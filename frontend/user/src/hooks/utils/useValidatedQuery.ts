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
 * // 基本用法 - 指定返回类型
 * const { data, isLoading, error } = useValidatedQuery<DeviceListResponse>({
 *   queryKey: ['devices'],
 *   queryFn: () => deviceService.getMyDevices(),
 *   schema: DevicesResponseSchema, // 仅用于运行时验证
 * });
 * ```
 */

import { useQuery, type UseQueryOptions, type QueryKey } from '@tanstack/react-query';
import { z } from 'zod';
import { message } from 'antd';

/**
 * useValidatedQuery 的配置选项
 *
 * @typeParam TOutput - 返回类型（由调用方显式指定）
 * @typeParam TQueryKey - Query key 类型
 */
interface UseValidatedQueryOptions<
  TOutput,
  TQueryKey extends QueryKey = QueryKey,
> extends Omit<UseQueryOptions<TOutput, Error, TOutput, TQueryKey>, 'queryFn'> {
  /**
   * 查询函数 (返回未验证的数据)
   */
  queryFn: () => Promise<unknown>;

  /**
   * Zod Schema (仅用于运行时验证，类型不参与推断)
   */
  schema: z.ZodType<unknown>;

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
 * 自动验证 API 响应,确保数据符合预期格式。
 * TypeScript 类型由泛型参数 TOutput 控制，不依赖 Schema 推断。
 *
 * @typeParam TOutput - 返回数据类型（必须显式指定）
 * @typeParam TQueryKey - Query key 类型
 */
export function useValidatedQuery<
  TOutput,
  TQueryKey extends QueryKey = QueryKey,
>({
  queryFn,
  schema,
  showValidationError = true,
  logValidationErrors = import.meta.env.DEV,
  ...options
}: UseValidatedQueryOptions<TOutput, TQueryKey>) {
  return useQuery<TOutput, Error, TOutput, TQueryKey>({
    ...options,
    queryFn: async () => {
      try {
        // 执行 API 请求
        const response = await queryFn();

        // Zod 运行时验证
        const result = schema.safeParse(response);

        if (!result.success) {
          // 验证失败 - 开发模式仅警告，不阻塞
          if (logValidationErrors) {
            console.warn('⚠️ API响应验证警告 (开发模式):', {
              queryKey: options.queryKey,
              response,
              errors: result.error.issues.slice(0, 5), // 只显示前5个
              totalErrors: result.error.issues.length,
              schema: schema.description || 'Schema',
            });
          }

          // 开发模式: 返回原始响应，不阻塞应用
          if (import.meta.env.DEV) {
            return response as TOutput;
          }

          // 生产模式: 严格验证
          if (showValidationError) {
            message.error('数据格式错误,请刷新页面重试');
          }
          throw new Error('API 响应数据格式验证失败');
        }

        // 验证成功,返回数据
        // 使用类型断言将 unknown 转换为 TOutput
        return result.data as TOutput;
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

/**
 * 简化版 useValidatedQuery - 不进行验证，仅用于类型
 *
 * 当你不需要运行时验证时使用此版本，仅提供类型支持。
 */
export function useTypedQuery<TData, TQueryKey extends QueryKey = QueryKey>({
  queryFn,
  ...options
}: {
  queryFn: () => Promise<TData>;
} & Omit<UseQueryOptions<TData, Error, TData, TQueryKey>, 'queryFn'>) {
  return useQuery<TData, Error, TData, TQueryKey>({
    ...options,
    queryFn,
  });
}
