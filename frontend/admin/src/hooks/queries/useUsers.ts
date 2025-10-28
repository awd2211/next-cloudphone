/**
 * 用户相关的 React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserBalance,
  updateUserBalance,
} from '../../services/user';
import type { User, CreateUserDto, UpdateUserDto, PaginationParams } from '../../types';

/**
 * Query Keys
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: PaginationParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  balance: (id: string) => [...userKeys.all, 'balance', id] as const,
};

/**
 * 获取用户列表
 */
export function useUsers(params: PaginationParams) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => getUsers(params),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * 获取单个用户详情
 */
export function useUser(id: string, enabled = true) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => getUser(id),
    enabled: enabled && !!id,
  });
}

/**
 * 获取用户余额
 */
export function useUserBalance(userId: string, enabled = true) {
  return useQuery({
    queryKey: userKeys.balance(userId),
    queryFn: () => getUserBalance(userId),
    enabled: enabled && !!userId,
  });
}

/**
 * 创建用户
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserDto) => createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      message.success('用户创建成功');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '用户创建失败');
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
      updateUser(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      message.success('用户更新成功');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '用户更新失败');
    },
  });
}

/**
 * 删除用户
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: userKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      message.success('用户删除成功');
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '用户删除失败');
    },
  });
}

/**
 * 更新用户余额
 */
export function useUpdateUserBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, amount, type }: {
      userId: string;
      amount: number;
      type: 'recharge' | 'deduct';
    }) => updateUserBalance(userId, amount, type),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: userKeys.balance(variables.userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
      message.success(
        variables.type === 'recharge' ? '充值成功' : '扣款成功'
      );
    },
    onError: (error: any) => {
      message.error(error.response?.data?.message || '操作失败');
    },
  });
}
