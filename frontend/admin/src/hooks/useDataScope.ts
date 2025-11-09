import { useState, useEffect, useCallback } from 'react';
import request from '../utils/request';

/**
 * 数据范围类型
 */
export enum ScopeType {
  ALL = 'all',
  TENANT = 'tenant',
  DEPARTMENT = 'department',
  DEPARTMENT_ONLY = 'department_only',
  SELF = 'self',
  CUSTOM = 'custom',
}

/**
 * 数据范围配置
 */
export interface DataScope {
  id: string;
  roleId: string;
  resourceType: string;
  scopeType: ScopeType;
  filter?: Record<string, any>;
  departmentIds?: string[];
  includeSubDepartments?: boolean;
  priority?: number;
  isActive?: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 数据范围元数据
 */
export interface ScopeTypeMetadata {
  value: ScopeType;
  label: string;
  description?: string;
}

/**
 * 创建数据范围 DTO
 */
export interface CreateDataScopeDto {
  roleId: string;
  resourceType: string;
  scopeType: ScopeType;
  filter?: Record<string, any>;
  departmentIds?: string[];
  includeSubDepartments?: boolean;
  description?: string;
  priority?: number;
}

/**
 * 更新数据范围 DTO
 */
export interface UpdateDataScopeDto {
  scopeType?: ScopeType;
  filter?: Record<string, any>;
  departmentIds?: string[];
  includeSubDepartments?: boolean;
  description?: string;
  isActive?: boolean;
  priority?: number;
}

/**
 * 查询参数（支持分页）
 */
export interface DataScopeQueryParams {
  roleId?: string;
  resourceType?: string;
  scopeType?: ScopeType;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * useDataScope Hook
 * 用于管理和查询数据范围配置
 *
 * @example
 * const {
 *   dataScopes,
 *   loading,
 *   fetchDataScopes,
 *   getScopeTypes,
 *   createDataScope,
 *   updateDataScope,
 *   deleteDataScope,
 * } = useDataScope();
 *
 * // 获取角色的数据范围配置
 * const scopes = await fetchDataScopes({ roleId: 'xxx', resourceType: 'device' });
 *
 * // 创建数据范围
 * await createDataScope({
 *   roleId: 'xxx',
 *   resourceType: 'device',
 *   scopeType: ScopeType.DEPARTMENT,
 *   includeSubDepartments: true,
 * });
 */
export const useDataScope = () => {
  const [dataScopes, setDataScopes] = useState<DataScope[]>([]);
  const [scopeTypes, setScopeTypes] = useState<ScopeTypeMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 获取数据范围列表（支持分页）
   */
  const fetchDataScopes = useCallback(async (params?: DataScopeQueryParams) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (params?.roleId) queryParams.append('roleId', params.roleId);
      if (params?.resourceType) queryParams.append('resourceType', params.resourceType);
      if (params?.scopeType) queryParams.append('scopeType', params.scopeType);
      if (params?.isActive !== undefined) queryParams.append('isActive', String(params.isActive));
      // ✅ 添加分页参数
      if (params?.page) queryParams.append('page', String(params.page));
      if (params?.pageSize) queryParams.append('pageSize', String(params.pageSize));

      const response = await request.get(
        `/data-scopes${queryParams.toString() ? `?${queryParams}` : ''}`
      );

      console.log('🔍 useDataScope fetchDataScopes 响应:', response);
      console.log('📊 response.success:', response.success);
      console.log('📊 response.data:', response.data);
      console.log('📊 response.total:', response.total);

      if (response.success) {
        const scopesData = response.data || [];
        console.log('✅ 设置 dataScopes:', scopesData);
        setDataScopes(scopesData);
        // ✅ 返回分页信息
        return {
          data: scopesData as DataScope[],
          total: response.total || 0,
          page: response.page || params?.page || 1,
          pageSize: response.pageSize || params?.pageSize || 20,
        };
      } else {
        throw new Error(response.message || '获取数据范围失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 根据 ID 获取数据范围
   */
  const getDataScope = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await request.get(`/data-scopes/${id}`);

      if (response.success) {
        return response.data as DataScope;
      } else {
        throw new Error(response.message || '获取数据范围失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取角色的数据范围配置
   */
  const getRoleDataScopes = useCallback(async (roleId: string, resourceType?: string) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = resourceType ? `?resourceType=${resourceType}` : '';
      const response = await request.get(`/data-scopes/role/${roleId}${queryParams}`);

      if (response.success) {
        return response.data as Record<string, DataScope[]>;
      } else {
        throw new Error(response.message || '获取角色数据范围失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 创建数据范围配置
   */
  const createDataScope = useCallback(async (dto: CreateDataScopeDto) => {
    setLoading(true);
    setError(null);

    try {
      const response = await request.post('/data-scopes', dto);

      if (response.success) {
        return response.data as DataScope;
      } else {
        throw new Error(response.message || '创建数据范围失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 更新数据范围配置
   */
  const updateDataScope = useCallback(async (id: string, dto: UpdateDataScopeDto) => {
    setLoading(true);
    setError(null);

    try {
      const response = await request.put(`/data-scopes/${id}`, dto);

      if (response.success) {
        return response.data as DataScope;
      } else {
        throw new Error(response.message || '更新数据范围失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 删除数据范围配置
   */
  const deleteDataScope = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await request.delete(`/data-scopes/${id}`);

      if (response.success) {
        return true;
      } else {
        throw new Error(response.message || '删除数据范围失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 批量创建数据范围
   */
  const batchCreateDataScopes = useCallback(async (dtos: CreateDataScopeDto[]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await request.post('/data-scopes/batch', dtos);

      if (response.success) {
        return response.data as DataScope[];
      } else {
        throw new Error(response.message || '批量创建数据范围失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 切换数据范围启用状态
   */
  const toggleDataScope = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await request.put(`/data-scopes/${id}/toggle`, {});

      if (response.success) {
        return response.data as DataScope;
      } else {
        throw new Error(response.message || '切换数据范围状态失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取数据范围类型元数据
   */
  const getScopeTypes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await request.get('/data-scopes/meta/scope-types');

      if (response.success) {
        setScopeTypes(response.data || []);
        return response.data as ScopeTypeMetadata[];
      } else {
        throw new Error(response.message || '获取范围类型失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 检查数据访问权限
   * 根据用户的数据范围配置判断是否有权访问特定数据
   */
  const checkDataAccess = useCallback(
    (
      dataScopes: DataScope[],
      resourceData: any,
      context: {
        userId?: string;
        tenantId?: string;
        departmentId?: string;
      }
    ): boolean => {
      if (!dataScopes || dataScopes.length === 0) {
        return false;
      }

      // 按优先级排序
      const sortedScopes = [...dataScopes].sort(
        (a, b) => (a.priority || 100) - (b.priority || 100)
      );

      for (const scope of sortedScopes) {
        if (!scope.isActive) continue;

        switch (scope.scopeType) {
          case ScopeType.ALL:
            return true;

          case ScopeType.TENANT:
            if (context.tenantId && resourceData.tenantId === context.tenantId) {
              return true;
            }
            break;

          case ScopeType.DEPARTMENT:
          case ScopeType.DEPARTMENT_ONLY:
            if (context.departmentId) {
              if (scope.departmentIds && scope.departmentIds.includes(resourceData.departmentId)) {
                return true;
              }
              // 如果启用了子部门包含，需要额外检查（前端通常不做层级检查，交给后端）
              if (
                scope.includeSubDepartments &&
                resourceData.departmentId === context.departmentId
              ) {
                return true;
              }
            }
            break;

          case ScopeType.SELF:
            if (context.userId && resourceData.userId === context.userId) {
              return true;
            }
            break;

          case ScopeType.CUSTOM:
            // 自定义过滤器通常由后端处理，前端简单判断
            if (scope.filter) {
              const match = Object.entries(scope.filter).every(([key, value]) => {
                return resourceData[key] === value;
              });
              if (match) return true;
            }
            break;
        }
      }

      return false;
    },
    []
  );

  /**
   * 获取数据范围的描述文本
   */
  const getScopeDescription = useCallback((scope: DataScope): string => {
    const scopeLabels: Record<ScopeType, string> = {
      [ScopeType.ALL]: '全部数据',
      [ScopeType.TENANT]: '租户数据',
      [ScopeType.DEPARTMENT]: '部门及子部门数据',
      [ScopeType.DEPARTMENT_ONLY]: '仅本部门数据',
      [ScopeType.SELF]: '仅本人数据',
      [ScopeType.CUSTOM]: '自定义范围',
    };

    let desc = scopeLabels[scope.scopeType] || scope.scopeType;

    if (scope.scopeType === ScopeType.DEPARTMENT && scope.departmentIds) {
      desc += ` (${scope.departmentIds.length} 个部门)`;
    }

    if (scope.scopeType === ScopeType.CUSTOM && scope.filter) {
      const filterCount = Object.keys(scope.filter).length;
      desc += ` (${filterCount} 个条件)`;
    }

    return desc;
  }, []);

  /**
   * 初始化加载范围类型
   */
  useEffect(() => {
    getScopeTypes().catch(console.error);
  }, [getScopeTypes]);

  return {
    // 状态
    dataScopes,
    scopeTypes,
    loading,
    error,

    // 查询方法
    fetchDataScopes,
    getDataScope,
    getRoleDataScopes,
    getScopeTypes,

    // 修改方法
    createDataScope,
    updateDataScope,
    deleteDataScope,
    batchCreateDataScopes,
    toggleDataScope,

    // 工具方法
    checkDataAccess,
    getScopeDescription,
  };
};

/**
 * 数据范围选择器组件的 Props
 */
export interface DataScopeSelectorProps {
  value?: ScopeType;
  onChange?: (value: ScopeType) => void;
  disabled?: boolean;
}

export default useDataScope;
