/**
 * 测试工具函数
 *
 * 提供常用的测试辅助函数
 */

import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

/**
 * 创建测试用的 QueryClient
 *
 * 禁用重试和缓存，确保测试的可预测性
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // 禁用重试
        gcTime: 0, // 禁用缓存
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    // React Query v5: logger 配置已移除
  });
}

/**
 * 自定义渲染函数
 *
 * 包装组件与必要的 Provider
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  initialRoute?: string;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    initialRoute = '/',
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  // 设置初始路由
  window.history.pushState({}, 'Test page', initialRoute);

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>{children}</BrowserRouter>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * 等待异步操作完成
 */
export const waitFor = async (callback: () => void | Promise<void>, timeout = 3000) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      await callback();
      return;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  throw new Error(`Timeout after ${timeout}ms`);
};

/**
 * 模拟延迟
 */
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 重新导出所有 testing-library 函数
export * from '@testing-library/react';
