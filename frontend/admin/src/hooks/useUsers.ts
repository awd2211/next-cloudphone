import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as userService from '@/services/user';
import type { User, CreateUserDto, UpdateUserDto, PaginationParams } from '@/types';

/**
 * User Query Keys
 * 分层结构便于精确的缓存失效
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  stats: () => [...userKeys.all, 'stats'] as const,
};

/**
 * 获取用户列表
 */
export function useUsers(params?: PaginationParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => userService.getUsers(params),
    staleTime: 30 * 1000, // 30 秒
  });
}

/**
 * 获取单个用户详情
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => userService.getUser(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * 获取用户统计
 */
export function useUserStats() {
  return useQuery({
    queryKey: userKeys.stats(),
    queryFn: () => userService.getUserStats(),
    staleTime: 60 * 1000, // 统计数据可以缓存更久
  });
}

/**
 * 创建用户
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      // 失效所有用户列表查询
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.stats() });
      message.success('用户创建成功');
    },
    onError: (error: any) => {
      message.error(`创建失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 更新用户
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      userService.updateUser(id, data),
    onSuccess: (_, variables) => {
      // 失效特定用户和列表
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      message.success('用户更新成功');
    },
    onError: (error: any) => {
      message.error(`更新失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 删除用户
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userService.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.stats() });
      message.success('用户删除成功');
    },
    onError: (error: any) => {
      message.error(`删除失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 启用/禁用用户
 */
export function useToggleUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      userService.updateUser(id, { enabled }),

    // 乐观更新
    onMutate: async ({ id, enabled }) => {
      await queryClient.cancelQueries({ queryKey: userKeys.detail(id) });

      const previousUser = queryClient.getQueryData<User>(userKeys.detail(id));

      if (previousUser) {
        queryClient.setQueryData<User>(userKeys.detail(id), {
          ...previousUser,
          enabled,
        });
      }

      return { previousUser };
    },

    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      message.success('状态更新成功');
    },

    onError: (error: any, { id }, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(userKeys.detail(id), context.previousUser);
      }
      message.error(`更新失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 重置用户密码
 */
export function useResetPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      userService.resetPassword(id, newPassword),
    onSuccess: () => {
      message.success('密码重置成功');
    },
    onError: (error: any) => {
      message.error(`重置失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 批量删除用户
 */
export function useBatchDeleteUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => userService.batchDeleteUsers(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.stats() });
      message.success('批量删除成功');
    },
    onError: (error: any) => {
      message.error(`批量删除失败: ${error.response?.data?.message || error.message}`);
    },
  });
}
