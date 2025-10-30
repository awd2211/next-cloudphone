import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { ReactNode } from 'react';

/**
 * React Query 配置
 *
 * 功能：
 * - 自动请求去重
 * - 请求缓存（staleTime 内使用缓存）
 * - 后台自动刷新（staleTime 过期后）
 * - 失败重试（网络错误自动重试）
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据保持新鲜的时间（30秒内不会重新请求）
      staleTime: 30 * 1000, // 30 seconds

      // 缓存时间（5分钟内切换回来仍使用缓存）
      gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)

      // 失败重试配置
      retry: (failureCount, error: any) => {
        // 4xx 错误不重试（客户端错误）
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // 5xx 错误或网络错误，最多重试 2 次
        return failureCount < 2;
      },

      // 重试延迟（指数退避）
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // 窗口聚焦时重新获取（用户回到页面时刷新数据）
      refetchOnWindowFocus: true,

      // 重新连接时重新获取
      refetchOnReconnect: true,

      // 挂载时重新获取
      refetchOnMount: true,
    },
    mutations: {
      // Mutation 失败重试 1 次
      retry: 1,
    },
  },
});

/**
 * React Query Provider 组件
 * 包装应用并提供 React Query 上下文
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 开发环境显示 DevTools */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
