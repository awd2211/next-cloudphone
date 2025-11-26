/**
 * Users React Query Hooks
 *
 * 基于 @/services/user
 * 使用 React Query + Zod 进行数据获取和验证
 * ✅ 完全类型安全
 * ✅ 支持无限滚动（useInfiniteUsers）
 * ✅ 支持下一页预加载（usePrefetchNextPage）
 * ✅ 支持乐观更新（useToggleUserStatus）
 */

import React from 'react';
import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
  type UseQueryOptions,
  type InfiniteData,
} from '@tanstack/react-query';
import { message } from 'antd';
import * as userService from '@/services/user';
import { useValidatedQuery } from '../utils/useValidatedQuery';
import {
  UserSchema,
  PaginatedResponseSchema,
} from '@/schemas/api.schemas';
import type {
  User,
  UpdateUserDto,
  PaginationParams,
  PaginatedResponse,
  UserStatus,
} from '@/types';
import { handleError } from '@/utils/errorHandling';

// ============================================================================
// Query Keys
// ============================================================================

/**
 * 用户查询键工厂
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...userKeys.lists(), params] as const,
  infinite: (params?: Omit<PaginationParams, 'page'>) =>
    [...userKeys.all, 'infinite', params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  stats: () => [...userKeys.all, 'stats'] as const,
};

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * 获取用户列表（带 Zod 验证）
 */
export const useUsers = (
  params?: PaginationParams,
  options?: Omit<UseQueryOptions<PaginatedResponse<User>, Error>, 'queryKey' | 'queryFn'>
) => {
  return useValidatedQuery({
    queryKey: userKeys.list(params),
    queryFn: () => userService.getUsers(params),
    schema: PaginatedResponseSchema(UserSchema) as any,
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * 获取单个用户详情（带 Zod 验证）
 */
export const useUser = (
  id: string,
  options?: Omit<UseQueryOptions<User, Error>, 'queryKey' | 'queryFn'>
) => {
  return useValidatedQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userService.getUser(id),
    schema: UserSchema as any,
    enabled: !!id,
    staleTime: 30 * 1000,
    ...options,
  });
};

/**
 * 获取用户统计
 */
export const useUserStats = () => {
  return useQuery({
    queryKey: userKeys.stats(),
    queryFn: () => userService.getUserStats(),
    staleTime: 60 * 1000,
  });
};

/**
 * 无限滚动获取用户列表
 */
export const useInfiniteUsers = (params?: Omit<PaginationParams, 'page'>) => {
  return useInfiniteQuery<
    PaginatedResponse<User>,
    Error,
    InfiniteData<PaginatedResponse<User>>,
    ReturnType<typeof userKeys.infinite>,
    number
  >({
    queryKey: userKeys.infinite(params),
    queryFn: ({ pageParam = 1 }) =>
      userService.getUsers({ ...params, page: pageParam }),
    getNextPageParam: (lastPage) => {
      const currentPage = lastPage.page || 1;
      const totalPages = Math.ceil((lastPage.total || 0) / (lastPage.pageSize || 10));
      return currentPage < totalPages ? currentPage + 1 : undefined;
    },
    initialPageParam: 1,
    staleTime: 30 * 1000,
  });
};

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * 创建用户 Mutation
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.infinite() });
      queryClient.invalidateQueries({ queryKey: userKeys.stats() });
      message.success('用户创建成功');
    },
    onError: (error: Error) => {
      message.error(`创建失败: ${error.message}`);
    },
  });
};

/**
 * 更新用户 Mutation
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      userService.updateUser(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.infinite() });
      message.success('用户更新成功');
    },
    onError: (error: Error) => {
      handleError(error, {
        customMessage: '更新用户失败',
      });
    },
  });
};

/**
 * 删除用户 Mutation
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.infinite() });
      queryClient.invalidateQueries({ queryKey: userKeys.stats() });
      message.success('用户删除成功');
    },
    onError: (error: Error) => {
      handleError(error, {
        customMessage: '删除用户失败，该用户可能有关联数据',
      });
    },
  });
};

/**
 * 启用/禁用用户 Mutation（带乐观更新）
 *
 * 乐观更新策略：
 * 1. 立即更新 UI（用户感知快）
 * 2. 后台发送请求
 * 3. 失败时回滚到之前的状态
 */
export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      userService.updateUser(id, { status: (enabled ? 'active' : 'inactive') as UserStatus }),

    // 乐观更新：在请求发送前立即更新缓存
    onMutate: async ({ id, enabled }) => {
      // 取消正在进行的相关查询，防止覆盖乐观更新
      await queryClient.cancelQueries({ queryKey: userKeys.lists() });

      // 保存之前的数据用于回滚
      const previousLists = queryClient.getQueriesData({ queryKey: userKeys.lists() });

      // 乐观更新所有包含该用户的列表缓存
      queryClient.setQueriesData(
        { queryKey: userKeys.lists() },
        (old: PaginatedResponse<User> | undefined) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((user) =>
              user.id === id
                ? { ...user, status: (enabled ? 'active' : 'inactive') as UserStatus }
                : user
            ),
          };
        }
      );

      // 返回上下文，包含回滚数据
      return { previousLists };
    },

    // 请求失败时回滚
    onError: (error: Error, _variables, context) => {
      // 恢复之前的数据
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      message.error(`更新失败: ${error.message}`);
    },

    // 请求成功后刷新数据（确保与服务器同步）
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.infinite() });
    },

    onSuccess: () => {
      message.success('状态更新成功');
    },
  });
};

/**
 * 重置用户密码 Mutation
 */
export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      userService.resetPassword(id, newPassword),
    onSuccess: () => {
      message.success('密码重置成功');
    },
    onError: (error: Error) => {
      message.error(`重置失败: ${error.message}`);
    },
  });
};

/**
 * 批量删除用户 Mutation
 */
export const useBatchDeleteUsers = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => userService.batchDeleteUsers(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.infinite() });
      queryClient.invalidateQueries({ queryKey: userKeys.stats() });
      message.success('批量删除成功');
    },
    onError: (error: Error) => {
      message.error(`批量删除失败: ${error.message}`);
    },
  });
};

// ============================================================================
// Prefetch Hooks
// ============================================================================

interface PrefetchNextPageOptions {
  currentPage: number;
  pageSize: number;
  total: number;
  queryKey: string;
  params?: PaginationParams;
}

/**
 * 预加载下一页数据
 *
 * 自动在后台预加载下一页数据，提升翻页体验
 * 仅当下一页存在且未缓存时才会预加载
 */
export const usePrefetchNextPage = ({
  currentPage,
  pageSize,
  total,
  params,
}: PrefetchNextPageOptions) => {
  const queryClient = useQueryClient();

  // 计算总页数和下一页
  const totalPages = Math.ceil(total / pageSize);
  const nextPage = currentPage + 1;
  const hasNextPage = nextPage <= totalPages;

  // 在 currentPage 变化时预加载下一页
  React.useEffect(() => {
    if (!hasNextPage) return;

    const nextPageParams = { ...params, page: nextPage, pageSize };
    const nextPageKey = userKeys.list(nextPageParams);

    // 检查是否已缓存
    const cached = queryClient.getQueryData(nextPageKey);
    if (cached) return;

    // 预加载下一页（静默，不显示 loading）
    queryClient.prefetchQuery({
      queryKey: nextPageKey,
      queryFn: () => userService.getUsers(nextPageParams),
      staleTime: 30 * 1000,
    });
  }, [currentPage, hasNextPage, nextPage, pageSize, params, queryClient]);
};
