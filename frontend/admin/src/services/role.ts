import request from '@/utils/request';
import type { Role, Permission, PaginationParams, PaginatedResponse } from '@/types';

// 角色列表
export const getRoles = (params?: PaginationParams) => {
  return request.get<PaginatedResponse<Role>>('/roles', { params });
};

// 获取角色详情
export const getRole = (id: string) => {
  return request.get<Role>(`/roles/${id}`);
};

// 创建角色
export const createRole = (data: {
  name: string;
  description?: string;
  permissionIds: string[];
}) => {
  return request.post<Role>('/roles', data);
};

// 更新角色
export const updateRole = (
  id: string,
  data: { name?: string; description?: string; permissionIds?: string[] }
) => {
  return request.patch<Role>(`/roles/${id}`, data);
};

// 删除角色
export const deleteRole = (id: string) => {
  return request.delete(`/roles/${id}`);
};

// 获取所有权限
export const getPermissions = () => {
  // 获取所有权限，设置一个很大的 limit
  return request.get<Permission[]>('/permissions', { params: { page: 1, limit: 1000 } });
};

// 创建权限
export const createPermission = (data: {
  resource: string;
  action: string;
  description?: string;
}) => {
  return request.post<Permission>('/permissions', data);
};

// 更新权限
export const updatePermission = (
  id: string,
  data: { resource?: string; action?: string; description?: string }
) => {
  return request.patch<Permission>(`/permissions/${id}`, data);
};

// 删除权限
export const deletePermission = (id: string) => {
  return request.delete(`/permissions/${id}`);
};

// 为角色分配权限
export const assignPermissionsToRole = (roleId: string, permissionIds: string[]) => {
  return request.post(`/roles/${roleId}/permissions`, { permissionIds });
};

// 从角色移除权限 (P1 优先级)
export const removePermissionsFromRole = (roleId: string, permissionIds: string[]) => {
  return request.delete(`/roles/${roleId}/permissions`, { data: { permissionIds } });
};

// 获取单个权限详情 (P2 优先级)
export const getPermission = (id: string) => {
  return request.get<Permission>(`/permissions/${id}`);
};

// 按资源获取权限 (P2 优先级)
export const getPermissionsByResource = (resource: string) => {
  return request.get<Permission[]>(`/permissions/resource/${resource}`);
};

// 批量创建权限 (P2 优先级)
export const bulkCreatePermissions = (
  data: Array<{ resource: string; action: string; description?: string }>
) => {
  return request.post<Permission[]>('/permissions/bulk', data);
};
