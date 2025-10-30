import request from '@/utils/request';
import type { DataScope, ScopeType, CreateDataScopeDto, UpdateDataScopeDto } from '@/types';

/**
 * 获取范围类型元数据
 */
export const getScopeTypes = () => {
  return request.get<{
    success: boolean;
    data: Array<{
      value: ScopeType;
      label: string;
    }>;
  }>('/data-scopes/meta/scope-types');
};

/**
 * 获取所有数据范围配置
 */
export const getAllDataScopes = (params?: {
  roleId?: string;
  resourceType?: string;
  isActive?: boolean;
}) => {
  return request.get<{
    success: boolean;
    data: DataScope[];
    total: number;
  }>('/data-scopes', { params });
};

/**
 * 获取单个数据范围配置
 */
export const getDataScopeById = (id: string) => {
  return request.get<{
    success: boolean;
    data: DataScope;
  }>(`/data-scopes/${id}`);
};

/**
 * 获取角色的数据范围配置
 */
export const getDataScopesByRole = (roleId: string) => {
  return request.get<{
    success: boolean;
    data: Record<string, DataScope[]>; // 按资源类型分组
    total: number;
  }>(`/data-scopes/role/${roleId}`);
};

/**
 * 创建数据范围配置
 */
export const createDataScope = (data: CreateDataScopeDto) => {
  return request.post<{
    success: boolean;
    message: string;
    data: DataScope;
  }>('/data-scopes', data);
};

/**
 * 更新数据范围配置
 */
export const updateDataScope = (id: string, data: UpdateDataScopeDto) => {
  return request.put<{
    success: boolean;
    message: string;
    data: DataScope;
  }>(`/data-scopes/${id}`, data);
};

/**
 * 删除数据范围配置
 */
export const deleteDataScope = (id: string) => {
  return request.delete<{
    success: boolean;
    message: string;
  }>(`/data-scopes/${id}`);
};

/**
 * 批量创建数据范围配置
 */
export const batchCreateDataScopes = (data: CreateDataScopeDto[]) => {
  return request.post<{
    success: boolean;
    message: string;
    data: DataScope[];
  }>('/data-scopes/batch', data);
};

/**
 * 启用/禁用数据范围配置
 */
export const toggleDataScope = (id: string) => {
  return request.put<{
    success: boolean;
    message: string;
    data: DataScope;
  }>(`/data-scopes/${id}/toggle`);
};
