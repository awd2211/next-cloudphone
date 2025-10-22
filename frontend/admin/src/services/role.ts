import request from '@/utils/request';
import type { Role, Permission, PaginationParams, PaginatedResponse } from '@/types';

// 角色列表
export const getRoles = (params?: PaginationParams) => {
  return request.get<PaginatedResponse<Role>>('/users/roles', { params });
};

// 获取角色详情
export const getRole = (id: string) => {
  return request.get<Role>(`/users/roles/${id}`);
};

// 创建角色
export const createRole = (data: { name: string; description?: string; permissionIds: string[] }) => {
  return request.post<Role>('/users/roles', data);
};

// 更新角色
export const updateRole = (id: string, data: { name?: string; description?: string; permissionIds?: string[] }) => {
  return request.patch<Role>(`/users/roles/${id}`, data);
};

// 删除角色
export const deleteRole = (id: string) => {
  return request.delete(`/users/roles/${id}`);
};

// 获取所有权限
export const getPermissions = () => {
  return request.get<Permission[]>('/permissions');
};

// 创建权限
export const createPermission = (data: { resource: string; action: string; description?: string }) => {
  return request.post<Permission>('/permissions', data);
};

// 更新权限
export const updatePermission = (id: string, data: { resource?: string; action?: string; description?: string }) => {
  return request.patch<Permission>(`/permissions/${id}`, data);
};

// 删除权限
export const deletePermission = (id: string) => {
  return request.delete(`/permissions/${id}`);
};

// 为角色分配权限
export const assignPermissionsToRole = (roleId: string, permissionIds: string[]) => {
  return request.post(`/users/roles/${roleId}/permissions`, { permissionIds });
};
