/**
 * useUsers hook 测试
 *
 * 测试用户数据查询 hook 的各种场景
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useUsers } from '../useUsers';

// 创建测试用的 wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useUsers', () => {
  let wrapper: ReturnType<typeof createWrapper>;

  beforeEach(() => {
    wrapper = createWrapper();
  });

  it('应该成功获取用户列表', async () => {
    const { result } = renderHook(() => useUsers({ page: 1, pageSize: 10 }), {
      wrapper,
    });

    // 初始状态应该是 loading
    expect(result.current.isLoading).toBe(true);

    // 等待数据加载完成
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // 验证数据结构
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.data).toBeInstanceOf(Array);  // data 直接是数组，不是对象with items
    expect(result.current.data?.data.length).toBeGreaterThan(0);
  });

  it('应该返回正确的用户数据结构', async () => {
    const { result } = renderHook(() => useUsers({ page: 1, pageSize: 10 }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const firstUser = result.current.data?.data[0];  // 修正：data 直接是数组，不是 data.items

    // 验证用户对象的属性
    expect(firstUser).toHaveProperty('id');
    expect(firstUser).toHaveProperty('username');
    expect(firstUser).toHaveProperty('email');
    expect(firstUser).toHaveProperty('roles');  // 修正：roles 而不是 role
    expect(firstUser).toHaveProperty('status');
  });

  it('应该支持分页参数', async () => {
    const { result: page1Result } = renderHook(
      () => useUsers({ page: 1, pageSize: 10 }),
      { wrapper }
    );

    await waitFor(() => {
      expect(page1Result.current.isSuccess).toBe(true);
    });

    expect(page1Result.current.data?.page).toBe(1);  // 修正：data.page 而不是 data.data.page
    expect(page1Result.current.data?.pageSize).toBe(10);
  });

  it('应该支持禁用查询', () => {
    const { result } = renderHook(
      () => useUsers({ page: 1, pageSize: 10 }, { enabled: false }),
      { wrapper }
    );

    // 禁用时不应该发起请求
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });

  it('应该支持手动refetch', async () => {
    const { result } = renderHook(() => useUsers({ page: 1, pageSize: 10 }), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // 手动刷新
    const refetchResult = await result.current.refetch();

    expect(refetchResult.isSuccess).toBe(true);
    expect(refetchResult.data).toBeDefined();
  });
});
