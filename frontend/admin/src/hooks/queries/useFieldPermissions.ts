import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import * as fieldPermissionService from '@/services/fieldPermission';
import type {
  FieldPermission,
  FieldAccessLevel,
  OperationType,
  CreateFieldPermissionDto,
  UpdateFieldPermissionDto
} from '@/types';

/**
 * Field Permission Query Keys
 * 用于 React Query 缓存管理的键定义
 */
export const fieldPermissionKeys = {
  all: ['field-permissions'] as const,
  lists: () => [...fieldPermissionKeys.all, 'list'] as const,
  list: (params?: {
    roleId?: string;
    resourceType?: string;
    operation?: OperationType;
    page?: number;
    pageSize?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) => [...fieldPermissionKeys.lists(), params] as const,
  details: () => [...fieldPermissionKeys.all, 'detail'] as const,
  detail: (id: string) => [...fieldPermissionKeys.details(), id] as const,
  byRole: (roleId: string, resourceType?: string) =>
    [...fieldPermissionKeys.all, 'by-role', roleId, resourceType] as const,
  meta: {
    all: ['field-permissions', 'meta'] as const,
    accessLevels: () => [...fieldPermissionKeys.meta.all, 'access-levels'] as const,
    operationTypes: () => [...fieldPermissionKeys.meta.all, 'operation-types'] as const,
    transformExamples: () => [...fieldPermissionKeys.meta.all, 'transform-examples'] as const,
  },
};

/**
 * 获取字段权限列表 - 支持分页和排序
 *
 * ✅ 优化:
 * - 支持服务端分页，避免一次性加载所有数据
 * - 支持排序
 * - 30秒缓存时间
 *
 * @example
 * const { data, isLoading } = useFieldPermissions({
 *   roleId: 'xxx',
 *   page: 1,
 *   pageSize: 20
 * });
 */
export function useFieldPermissions(params?: {
  roleId?: string;
  resourceType?: string;
  operation?: OperationType;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}) {
  return useQuery({
    queryKey: fieldPermissionKeys.list(params),
    queryFn: () => fieldPermissionService.getAllFieldPermissions(params),
    staleTime: 30 * 1000, // ✅ 30秒缓存
    placeholderData: (previousData) => previousData, // ✅ 保持上一次数据，避免闪烁
    select: (data) => ({
      permissions: data.data || [],
      total: data.total || 0,
      page: data.page || params?.page || 1,
      pageSize: data.pageSize || params?.pageSize || 20,
      success: data.success,
    }),
  });
}

/**
 * 获取单个字段权限详情
 */
export function useFieldPermission(id: string) {
  return useQuery({
    queryKey: fieldPermissionKeys.detail(id),
    queryFn: () => fieldPermissionService.getFieldPermissionById(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    select: (data) => data.data,
  });
}

/**
 * 获取角色的字段权限配置
 */
export function useFieldPermissionsByRole(roleId: string, resourceType?: string) {
  return useQuery({
    queryKey: fieldPermissionKeys.byRole(roleId, resourceType),
    queryFn: () => fieldPermissionService.getFieldPermissionsByRole(roleId, resourceType),
    enabled: !!roleId,
    staleTime: 30 * 1000,
    select: (data) => ({
      data: data.data || {},
      total: data.total || 0,
      success: data.success,
    }),
  });
}

/**
 * 获取访问级别元数据
 * ✅ 懒加载优化：只在需要时加载
 */
export function useAccessLevels(enabled: boolean = true) {
  return useQuery({
    queryKey: fieldPermissionKeys.meta.accessLevels(),
    queryFn: fieldPermissionService.getAccessLevels,
    enabled, // ✅ 允许延迟加载
    staleTime: 5 * 60 * 1000, // ✅ 5分钟缓存（元数据很少变化）
    select: (data) => data.data || [],
  });
}

/**
 * 获取操作类型元数据
 * ✅ 懒加载优化：只在需要时加载
 */
export function useOperationTypes(enabled: boolean = true) {
  return useQuery({
    queryKey: fieldPermissionKeys.meta.operationTypes(),
    queryFn: fieldPermissionService.getOperationTypes,
    enabled, // ✅ 允许延迟加载
    staleTime: 5 * 60 * 1000, // ✅ 5分钟缓存
    select: (data) => data.data || [],
  });
}

/**
 * 获取字段转换规则示例
 * ✅ 懒加载：只在打开相关功能时加载
 */
export function useTransformExamples(enabled: boolean = false) {
  return useQuery({
    queryKey: fieldPermissionKeys.meta.transformExamples(),
    queryFn: fieldPermissionService.getTransformExamples,
    enabled, // ✅ 默认不加载，需要时才加载
    staleTime: 10 * 60 * 1000, // ✅ 10分钟缓存（示例数据基本不变）
    select: (data) => data.data,
  });
}

/**
 * 获取字段权限统计数据
 * ✅ 使用服务端聚合查询，避免加载所有数据
 * ✅ 1分钟缓存（统计数据不需要实时更新）
 */
export function useFieldPermissionStats() {
  return useQuery({
    queryKey: [...fieldPermissionKeys.all, 'stats'] as const,
    queryFn: fieldPermissionService.getFieldPermissionStats,
    staleTime: 60 * 1000, // ✅ 1分钟缓存
    select: (data) => data.data,
  });
}

/**
 * 创建字段权限配置
 */
export function useCreateFieldPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFieldPermissionDto) =>
      fieldPermissionService.createFieldPermission(data),
    onSuccess: () => {
      // 创建成功后，失效所有列表缓存和统计缓存
      queryClient.invalidateQueries({ queryKey: fieldPermissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...fieldPermissionKeys.all, 'stats'] });
      message.success('创建字段权限配置成功');
    },
    onError: (error: any) => {
      message.error(`创建失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 更新字段权限配置
 */
export function useUpdateFieldPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFieldPermissionDto }) =>
      fieldPermissionService.updateFieldPermission(id, data),
    onSuccess: (_, { id }) => {
      // 更新成功后，失效相关缓存（包括统计）
      queryClient.invalidateQueries({ queryKey: fieldPermissionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: fieldPermissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...fieldPermissionKeys.all, 'stats'] });
      message.success('更新字段权限配置成功');
    },
    onError: (error: any) => {
      message.error(`更新失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 删除字段权限配置
 */
export function useDeleteFieldPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fieldPermissionService.deleteFieldPermission(id),
    onSuccess: () => {
      // 删除成功后，失效列表缓存和统计缓存
      queryClient.invalidateQueries({ queryKey: fieldPermissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...fieldPermissionKeys.all, 'stats'] });
      message.success('删除字段权限配置成功');
    },
    onError: (error: any) => {
      message.error(`删除失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 批量创建字段权限配置
 */
export function useBatchCreateFieldPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFieldPermissionDto[]) =>
      fieldPermissionService.batchCreateFieldPermissions(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: fieldPermissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...fieldPermissionKeys.all, 'stats'] });
      const count = response.data?.length || 0;
      message.success(`成功创建 ${count} 条字段权限配置`);
    },
    onError: (error: any) => {
      message.error(`批量创建失败: ${error.response?.data?.message || error.message}`);
    },
  });
}

/**
 * 启用/禁用字段权限配置
 */
export function useToggleFieldPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => fieldPermissionService.toggleFieldPermission(id),
    onSuccess: (response, id) => {
      queryClient.invalidateQueries({ queryKey: fieldPermissionKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: fieldPermissionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: [...fieldPermissionKeys.all, 'stats'] });
      const isActive = response.data?.isActive;
      message.success(`字段权限配置已${isActive ? '启用' : '禁用'}`);
    },
    onError: (error: any) => {
      message.error(`操作失败: ${error.response?.data?.message || error.message}`);
    },
  });
}
