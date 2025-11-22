/**
 * DataScopes React Query Hooks
 *
 * 基于 @/services/dataScope
 * 使用 React Query + Zod 进行数据获取和验证
 */

import { useQuery, useMutation, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import { message } from 'antd';
import * as dataScopeService from '@/services/dataScope';
import type { CreateDataScopeDto, UpdateDataScopeDto, DataScope } from '@/types';

/**
 * Query Keys
 */
export const dataScopeKeys = {
  all: ['data-scopes'] as const,
  lists: () => [...dataScopeKeys.all, 'list'] as const,
  list: (params?: { roleId?: string; resourceType?: string; isActive?: boolean }) =>
    [...dataScopeKeys.lists(), params] as const,
  scopeTypes: () => [...dataScopeKeys.all, 'scope-types'] as const,
  roleScopes: (roleId: string) => [...dataScopeKeys.all, 'role', roleId] as const,
  details: () => [...dataScopeKeys.all, 'detail'] as const,
  detail: (id: string) => [...dataScopeKeys.details(), id] as const,
};

/**
 * 获取范围类型元数据
 */
export const useScopeTypes = () => {
  return useQuery({
    queryKey: dataScopeKeys.scopeTypes(),
    queryFn: () => dataScopeService.getScopeTypes(),
    staleTime: Infinity, // 元数据不变
  });
};

/**
 * 获取所有数据范围配置
 */
export const useDataScopes = (params?: {
  roleId?: string;
  resourceType?: string;
  isActive?: boolean;
}) => {
  return useQuery({
    queryKey: dataScopeKeys.list(params),
    queryFn: () => dataScopeService.getAllDataScopes(params),
  });
};

/**
 * 获取单个数据范围配置
 */
export const useDataScope = (
  id: string,
  options?: Omit<UseQueryOptions<DataScope>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: dataScopeKeys.detail(id),
    queryFn: () => dataScopeService.getDataScopeById(id),
    enabled: !!id,
    ...options,
  });
};

/**
 * 获取角色的数据范围配置
 */
export const useDataScopesByRole = (roleId: string) => {
  return useQuery({
    queryKey: dataScopeKeys.roleScopes(roleId),
    queryFn: () => dataScopeService.getDataScopesByRole(roleId),
    enabled: !!roleId,
  });
};

/**
 * 创建数据范围配置 Mutation
 */
export const useCreateDataScope = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDataScopeDto) => dataScopeService.createDataScope(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataScopeKeys.lists() });
      message.success('数据范围配置创建成功');
    },
    onError: () => {
      message.error('数据范围配置创建失败');
    },
  });
};

/**
 * 更新数据范围配置 Mutation
 */
export const useUpdateDataScope = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDataScopeDto }) =>
      dataScopeService.updateDataScope(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: dataScopeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dataScopeKeys.detail(id) });
      message.success('数据范围配置更新成功');
    },
    onError: () => {
      message.error('数据范围配置更新失败');
    },
  });
};

/**
 * 删除数据范围配置 Mutation
 */
export const useDeleteDataScope = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dataScopeService.deleteDataScope(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dataScopeKeys.lists() });
      message.success('数据范围配置删除成功');
    },
    onError: () => {
      message.error('数据范围配置删除失败');
    },
  });
};

/**
 * 批量创建数据范围配置 Mutation
 */
export const useBatchCreateDataScopes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDataScopeDto[]) => dataScopeService.batchCreateDataScopes(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: dataScopeKeys.lists() });
      const count = response?.length || 0;
      message.success(`成功创建 ${count} 个数据范围配置`);
    },
    onError: () => {
      message.error('批量创建数据范围配置失败');
    },
  });
};

/**
 * 启用/禁用数据范围配置 Mutation
 */
export const useToggleDataScope = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dataScopeService.toggleDataScope(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: dataScopeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: dataScopeKeys.detail(id) });
      message.success('操作成功');
    },
    onError: () => {
      message.error('操作失败');
    },
  });
};
