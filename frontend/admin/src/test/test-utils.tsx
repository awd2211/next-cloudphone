import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

/**
 * 创建测试用的 QueryClient
 * 关闭重试和缓存以加快测试速度
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // React Query v5: cacheTime → gcTime
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    // React Query v5: logger 配置已移除，使用环境变量控制日志
  });

/**
 * 包装所有 Provider 的 Wrapper 组件
 */
interface AllTheProvidersProps {
  children: React.ReactNode;
  queryClient?: QueryClient;
}

export const AllTheProviders = ({
  children,
  queryClient = createTestQueryClient(),
}: AllTheProvidersProps) => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
};

/**
 * 自定义渲染函数 - 包含所有必要的 Provider
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};

/**
 * 创建 Query Wrapper (用于 renderHook)
 */
export const createQueryWrapper = (queryClient?: QueryClient) => {
  const client = queryClient || createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
};

// 重新导出所有 testing-library 工具
export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';
