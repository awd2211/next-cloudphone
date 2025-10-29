import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as roleService from '@/services/role';
import type { Role, Permission, PaginationParams } from '@/types';

/**
 * Role Query Keys
 * 用于 React Query 缓存管理的键定义
 */
export const roleKeys = {
  all: ['roles'] as const,
  lists: () => [...roleKeys.all, 'list'] as const,
  list: (params?: PaginationParams) => [...roleKeys.lists(), params] as const,
  details: () => [...roleKeys.all, 'detail'] as const,
  detail: (id: string) => [...roleKeys.details(), id] as const,
};

/**
 * Permission Query Keys
 */
export const permissionKeys = {
  all: ['permissions'] as const,
  lists: () => [...permissionKeys.all, 'list'] as const,
};

/**
 * 获取角色列表
 */
export function useRoles(params?: PaginationParams) {
  return useQuery({
    queryKey: roleKeys.list(params),
    queryFn: () => roleService.getRoles(params),
    staleTime: 30 * 1000, // 30秒内认为数据新鲜
  });
}

/**
 * 获取单个角色详情
 */
export function useRole(id: string) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: () => roleService.getRole(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

/**
 * 获取所有权限列表
 */
export function usePermissions() {
  return useQuery({
    queryKey: permissionKeys.lists(),
    queryFn: async () => {
      const response = await roleService.getPermissions();

      // 智能处理不同的响应格式
      let data = response;

      // 如果有 success 字段，提取 data
      if (response && typeof response === 'object' && 'success' in response) {
        data = (response as any).data;
      }

      // 确保返回数组
      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray((data as any).data)) {
        // 如果返回的是 {data: [...]} 格式
        return (data as any).data;
      } else {
        console.error('权限数据格式错误:', response);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 权限列表可以缓存5分钟
  });
}

/**
 * 创建角色
 */
export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; description?: string; permissionIds?: string[] }) =>
      roleService.createRole(data),
    onSuccess: () => {
      // 创建成功后，失效列表缓存
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      message.success('创建角色成功');
    },
    onError: (error: any) => {
      message.error(`创建失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 更新角色
 */
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string } }) =>
      roleService.updateRole(id, data),
    onSuccess: (_, { id }) => {
      // 更新成功后，失效相关缓存
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      message.success('更新角色成功');
    },
    onError: (error: any) => {
      message.error(`更新失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 删除角色
 */
export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => roleService.deleteRole(id),
    onSuccess: () => {
      // 删除成功后，失效列表缓存
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      message.success('删除角色成功');
    },
    onError: (error: any) => {
      message.error(`删除失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 分配权限给角色
 */
export function useAssignPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      roleService.assignPermissionsToRole(roleId, permissionIds),
    onSuccess: (_, { roleId }) => {
      // 成功后失效相关缓存
      queryClient.invalidateQueries({ queryKey: roleKeys.detail(roleId) });
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      message.success('权限分配成功');
    },
    onError: (error: any) => {
      message.error(`权限分配失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 批量删除角色
 */
export function useBatchDeleteRoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) => roleService.batchDeleteRoles(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
      message.success(`成功删除 ${ids.length} 个角色`);
    },
    onError: (error: any) => {
      message.error(`批量删除失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

// ============= Permission CRUD Mutations =============

/**
 * 创建权限
 */
export function useCreatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { resource: string; action: string; description?: string }) =>
      roleService.createPermission(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.lists() });
      message.success('创建权限成功');
    },
    onError: (error: any) => {
      message.error(`创建失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 更新权限
 */
export function useUpdatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { resource?: string; action?: string; description?: string } }) =>
      roleService.updatePermission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.lists() });
      message.success('更新权限成功');
    },
    onError: (error: any) => {
      message.error(`更新失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 删除权限
 */
export function useDeletePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => roleService.deletePermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: permissionKeys.lists() });
      message.success('删除权限成功');
    },
    onError: (error: any) => {
      message.error(`删除失败: ${error.response?.data?.message || error.message}`);
    },
  });
}
