/**
 * Users React Query Hooks
 *
 * 基于 @/services/user
 * 使用 React Query + Zod 进行数据获取和验证
 * ✅ 完全类型安全
 * ✅ 支持无限滚动（useInfiniteUsers）
 */

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
 * 启用/禁用用户 Mutation
 */
export const useToggleUserStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      userService.updateUser(id, { status: (enabled ? 'active' : 'inactive') as UserStatus }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.infinite() });
      message.success('状态更新成功');
    },
    onError: (error: Error) => {
      message.error(`更新失败: ${error.message}`);
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
