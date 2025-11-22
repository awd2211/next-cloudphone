/**
 * 数据范围配置服务 API
 * 使用 api 包装器自动解包响应
 */
import { api } from '@/utils/api';
import type { DataScope, ScopeType, CreateDataScopeDto, UpdateDataScopeDto } from '@/types';

/**
 * 获取范围类型元数据
 */
export const getScopeTypes = (): Promise<{
  data: Array<{
    value: ScopeType;
    label: string;
  }>;
}> =>
  api.get<{
    data: Array<{
      value: ScopeType;
      label: string;
    }>;
  }>('/data-scopes/meta/scope-types');

/**
 * 获取所有数据范围配置
 */
export const getAllDataScopes = (params?: {
  roleId?: string;
  resourceType?: string;
  isActive?: boolean;
}): Promise<{
  data: DataScope[];
  total: number;
}> =>
  api.get<{
    data: DataScope[];
    total: number;
  }>('/data-scopes', { params });

/**
 * 获取单个数据范围配置
 */
export const getDataScopeById = async (id: string): Promise<DataScope> => {
  const res = await api.get<{ data: DataScope }>(`/data-scopes/${id}`);
  return res.data;
};

/**
 * 获取角色的数据范围配置
 */
export const getDataScopesByRole = (roleId: string): Promise<{
  data: Record<string, DataScope[]>;
  total: number;
}> =>
  api.get<{
    data: Record<string, DataScope[]>;
    total: number;
  }>(`/data-scopes/role/${roleId}`);

/**
 * 创建数据范围配置
 */
export const createDataScope = (data: CreateDataScopeDto): Promise<DataScope> =>
  api.post<DataScope>('/data-scopes', data);

/**
 * 更新数据范围配置
 */
export const updateDataScope = (id: string, data: UpdateDataScopeDto): Promise<DataScope> =>
  api.put<DataScope>(`/data-scopes/${id}`, data);

/**
 * 删除数据范围配置
 */
export const deleteDataScope = (id: string): Promise<void> =>
  api.delete<void>(`/data-scopes/${id}`);

/**
 * 批量创建数据范围配置
 */
export const batchCreateDataScopes = (data: CreateDataScopeDto[]): Promise<DataScope[]> =>
  api.post<DataScope[]>('/data-scopes/batch', data);

/**
 * 启用/禁用数据范围配置
 */
export const toggleDataScope = (id: string): Promise<DataScope> =>
  api.put<DataScope>(`/data-scopes/${id}/toggle`);
