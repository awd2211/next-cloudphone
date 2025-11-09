import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as userService from '@/services/user';
import type { User, CreateUserDto, UpdateUserDto, PaginationParams } from '@/types';
import { handleError } from '@/utils/errorHandling';

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
 * 更新用户 (带乐观更新)
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) =>
      userService.updateUser(id, data),

    // 乐观更新：在 API 调用前立即更新 UI
    onMutate: async ({ id, data }) => {
      // 取消正在进行的查询，避免覆盖乐观更新
      await queryClient.cancelQueries({ queryKey: userKeys.lists() });
      await queryClient.cancelQueries({ queryKey: userKeys.detail(id) });

      // 保存当前数据（用于回滚）
      const previousLists = queryClient.getQueriesData({ queryKey: userKeys.lists() });
      const previousDetail = queryClient.getQueryData(userKeys.detail(id));

      // 立即更新列表中的用户数据
      queryClient.setQueriesData(
        { queryKey: userKeys.lists() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((user: User) =>
              user.id === id ? { ...user, ...data } : user
            ),
          };
        }
      );

      // 立即更新用户详情数据
      if (previousDetail) {
        queryClient.setQueryData(userKeys.detail(id), {
          ...previousDetail as User,
          ...data,
        });
      }

      return { previousLists, previousDetail };
    },

    onSuccess: (_, { id }) => {
      // 成功后仍然失效缓存，确保数据一致性
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      message.success('用户更新成功');
    },

    onError: (error, { id }, context) => {
      // 失败时回滚到之前的数据
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(userKeys.detail(id), context.previousDetail);
      }

      // 使用统一错误处理
      handleError(error, {
        customMessage: '更新用户失败',
      });
    },
  });
}

/**
 * 删除用户 (带乐观更新)
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userService.deleteUser,

    // 乐观更新：立即从列表中移除
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: userKeys.lists() });
      await queryClient.cancelQueries({ queryKey: userKeys.detail(id) });

      const previousLists = queryClient.getQueriesData({ queryKey: userKeys.lists() });
      const previousDetail = queryClient.getQueryData(userKeys.detail(id));

      // 立即从所有列表中移除该用户
      queryClient.setQueriesData(
        { queryKey: userKeys.lists() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((user: User) => user.id !== id),
            total: old.total - 1, // 同时更新总数
          };
        }
      );

      // 移除详情缓存
      queryClient.removeQueries({ queryKey: userKeys.detail(id) });

      return { previousLists, previousDetail };
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.stats() });
      message.success('用户删除成功');
    },

    onError: (error, id, context) => {
      // 失败时恢复数据
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousDetail) {
        queryClient.setQueryData(userKeys.detail(id), context.previousDetail);
      }

      handleError(error, {
        customMessage: '删除用户失败，该用户可能有关联数据',
      });
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
