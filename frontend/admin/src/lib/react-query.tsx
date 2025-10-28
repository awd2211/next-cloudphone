/**
 * React Query 配置
 * 提供全局的数据获取和缓存配置
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';

/**
 * 创建 Query Client 实例
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 数据保持新鲜的时间（30秒内不会重新请求）
      staleTime: 30 * 1000,

      // 缓存数据的时间（5分钟后清除）
      gcTime: 5 * 60 * 1000,

      // 失败后重试次数
      retry: 1,

      // 重试延迟（指数退避）
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // 窗口获得焦点时重新验证
      refetchOnWindowFocus: false,

      // 网络重新连接时重新验证
      refetchOnReconnect: true,

      // 组件挂载时是否重新验证
      refetchOnMount: true,
    },
    mutations: {
      // Mutation 失败后重试次数
      retry: 0,
    },
  },
});

/**
 * React Query Provider 组件
 */
interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 开发环境显示 DevTools */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}
