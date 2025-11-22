/**
 * 角色与权限管理服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { Role, Permission, PaginationParams, PaginatedResponse } from '@/types';

// 角色列表（默认包含权限数据）
export const getRoles = (params?: PaginationParams & { includePermissions?: boolean }): Promise<PaginatedResponse<Role>> =>
  api.get<PaginatedResponse<Role>>('/roles', {
    params: { ...params, includePermissions: params?.includePermissions ?? true },
  });

// 获取角色详情
export const getRole = (id: string): Promise<Role> =>
  api.get<Role>(`/roles/${id}`);

// 创建角色
export const createRole = (data: {
  name: string;
  description?: string;
  permissionIds: string[];
}): Promise<Role> =>
  api.post<Role>('/roles', data);

// 更新角色
export const updateRole = (
  id: string,
  data: { name?: string; description?: string; permissionIds?: string[] }
): Promise<Role> =>
  api.patch<Role>(`/roles/${id}`, data);

// 删除角色
export const deleteRole = (id: string): Promise<void> =>
  api.delete<void>(`/roles/${id}`);

// 批量删除角色
export const batchDeleteRoles = (roleIds: string[]): Promise<void> =>
  api.post<void>('/roles/batch-delete', { roleIds });

// 获取所有权限（支持分页）
export const getPermissions = (params?: {
  page?: number;
  limit?: number;
  resource?: string;
}): Promise<{
  data: Permission[];
  total: number;
  page: number;
  limit: number;
}> =>
  api.get<{
    data: Permission[];
    total: number;
    page: number;
    limit: number;
  }>('/permissions', { params });

// 创建权限
export const createPermission = (data: {
  resource: string;
  action: string;
  description?: string;
}): Promise<Permission> =>
  api.post<Permission>('/permissions', data);

// 更新权限
export const updatePermission = (
  id: string,
  data: { resource?: string; action?: string; description?: string }
): Promise<Permission> =>
  api.patch<Permission>(`/permissions/${id}`, data);

// 删除权限
export const deletePermission = (id: string): Promise<void> =>
  api.delete<void>(`/permissions/${id}`);

// 为角色分配权限
export const assignPermissionsToRole = (roleId: string, permissionIds: string[]): Promise<void> =>
  api.post<void>(`/roles/${roleId}/permissions`, { permissionIds });

// 从角色移除权限 (P1 优先级)
export const removePermissionsFromRole = (roleId: string, permissionIds: string[]): Promise<void> =>
  api.delete<void>(`/roles/${roleId}/permissions`, { data: { permissionIds } });

// 获取单个权限详情 (P2 优先级)
export const getPermission = (id: string): Promise<Permission> =>
  api.get<Permission>(`/permissions/${id}`);

// 按资源获取权限 (P2 优先级)
export const getPermissionsByResource = (resource: string): Promise<Permission[]> =>
  api.get<Permission[]>(`/permissions/resource/${resource}`);

// 批量创建权限 (P2 优先级)
export const bulkCreatePermissions = (
  data: Array<{ resource: string; action: string; description?: string }>
): Promise<Permission[]> =>
  api.post<Permission[]>('/permissions/bulk', data);
