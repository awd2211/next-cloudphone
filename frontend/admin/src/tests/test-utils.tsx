/**
 * 测试工具函数
 * 提供常用的测试辅助函数和 Wrapper
 */

import { ReactElement, ReactNode } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

/**
 * 自定义渲染函数 - 包含所有必要的 Provider
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * 初始路由路径
   */
  initialRoute?: string;

  /**
   * 自定义 QueryClient
   */
  queryClient?: QueryClient;
}

/**
 * 创建测试用的 QueryClient
 * 关闭重试和缓存，加快测试速度
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // 关闭重试
        gcTime: Infinity, // 禁用垃圾回收
        staleTime: Infinity, // 数据永不过期
      },
      mutations: {
        retry: false, // 关闭重试
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
}

/**
 * 创建 All-in-One Wrapper
 * 包含：QueryClient, Router, ConfigProvider
 */
export function createTestWrapper(options: {
  queryClient?: QueryClient;
  initialRoute?: string;
} = {}) {
  const {
    queryClient = createTestQueryClient(),
    initialRoute = '/',
  } = options;

  // 设置初始路由
  if (initialRoute !== '/') {
    window.history.pushState({}, '', initialRoute);
  }

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ConfigProvider locale={zhCN}>
            {children}
          </ConfigProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };
}

/**
 * 自定义渲染函数
 * 自动包装必要的 Provider
 */
export function render(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): ReturnType<typeof rtlRender> {
  const {
    initialRoute = '/',
    queryClient,
    ...renderOptions
  } = options;

  const Wrapper = createTestWrapper({ queryClient, initialRoute });

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Mock localStorage
 */
export function mockLocalStorage() {
  const store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(key => delete store[key]);
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
}

/**
 * 等待异步更新
 * 比 waitFor 更简单的版本，用于大多数场景
 */
export async function waitForUpdate(timeout = 1000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, timeout));
}

/**
 * 模拟 API 响应延迟
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建 Mock 函数的工厂
 */
export function createMockFn<T extends (...args: any[]) => any>(
  implementation?: T
): jest.Mock {
  return implementation ? jest.fn(implementation) : jest.fn();
}

// 重新导出常用的 testing-library 工具
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
