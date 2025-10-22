import { useState, useCallback } from 'react';
import request from '../utils/request';

/**
 * 字段访问级别
 */
export enum FieldAccessLevel {
  HIDDEN = 'hidden',
  READ = 'read',
  WRITE = 'write',
  REQUIRED = 'required',
}

/**
 * 操作类型
 */
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  VIEW = 'view',
  EXPORT = 'export',
}

/**
 * 字段权限配置
 */
export interface FieldPermission {
  id: string;
  roleId: string;
  resourceType: string;
  operation: OperationType;
  hiddenFields?: string[];
  readOnlyFields?: string[];
  writableFields?: string[];
  requiredFields?: string[];
  fieldAccessMap?: Record<string, FieldAccessLevel>;
  fieldTransforms?: Record<string, any>;
  description?: string;
  priority?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 创建字段权限 DTO
 */
export interface CreateFieldPermissionDto {
  roleId: string;
  resourceType: string;
  operation: OperationType;
  hiddenFields?: string[];
  readOnlyFields?: string[];
  writableFields?: string[];
  requiredFields?: string[];
  fieldAccessMap?: Record<string, FieldAccessLevel>;
  fieldTransforms?: Record<string, any>;
  description?: string;
  priority?: number;
}

/**
 * 更新字段权限 DTO
 */
export interface UpdateFieldPermissionDto {
  hiddenFields?: string[];
  readOnlyFields?: string[];
  writableFields?: string[];
  requiredFields?: string[];
  fieldAccessMap?: Record<string, FieldAccessLevel>;
  fieldTransforms?: Record<string, any>;
  description?: string;
  isActive?: boolean;
  priority?: number;
}

/**
 * 查询参数
 */
export interface FieldPermissionQueryParams {
  roleId?: string;
  resourceType?: string;
  operation?: OperationType;
}

/**
 * useFieldPermission Hook
 * 用于管理字段权限配置
 *
 * @example
 * const {
 *   fieldPermissions,
 *   loading,
 *   fetchFieldPermissions,
 *   createFieldPermission,
 *   updateFieldPermission,
 *   deleteFieldPermission,
 * } = useFieldPermission();
 */
export const useFieldPermission = () => {
  const [fieldPermissions, setFieldPermissions] = useState<FieldPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 获取字段权限列表
   */
  const fetchFieldPermissions = useCallback(async (params?: FieldPermissionQueryParams) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      if (params?.roleId) queryParams.append('roleId', params.roleId);
      if (params?.resourceType) queryParams.append('resourceType', params.resourceType);
      if (params?.operation) queryParams.append('operation', params.operation);

      const response = await request.get(
        `/field-permissions${queryParams.toString() ? `?${queryParams}` : ''}`,
      );

      console.log('🔍 useFieldPermission fetchFieldPermissions 响应:', response);
      console.log('📊 response.success:', response.success);
      console.log('📊 response.data:', response.data);
      console.log('📊 response.data 长度:', response.data?.length);

      if (response.success) {
        const permissionsData = response.data || [];
        console.log('✅ 设置 fieldPermissions:', permissionsData);
        setFieldPermissions(permissionsData);
        return permissionsData as FieldPermission[];
      } else {
        throw new Error(response.message || '获取字段权限失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 根据 ID 获取字段权限
   */
  const getFieldPermission = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await request.get(`/field-permissions/${id}`);

      if (response.success) {
        return response.data as FieldPermission;
      } else {
        throw new Error(response.message || '获取字段权限失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取角色的字段权限配置
   */
  const getRoleFieldPermissions = useCallback(
    async (roleId: string, resourceType?: string) => {
      setLoading(true);
      setError(null);

      try {
        const queryParams = resourceType ? `?resourceType=${resourceType}` : '';
        const response = await request.get(`/field-permissions/role/${roleId}${queryParams}`);

        if (response.success) {
          return response.data as Record<string, FieldPermission[]>;
        } else {
          throw new Error(response.message || '获取角色字段权限失败');
        }
      } catch (err: any) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * 创建字段权限配置
   */
  const createFieldPermission = useCallback(async (dto: CreateFieldPermissionDto) => {
    setLoading(true);
    setError(null);

    try {
      const response = await request.post('/field-permissions', dto);

      if (response.success) {
        return response.data as FieldPermission;
      } else {
        throw new Error(response.message || '创建字段权限失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 更新字段权限配置
   */
  const updateFieldPermission = useCallback(
    async (id: string, dto: UpdateFieldPermissionDto) => {
      setLoading(true);
      setError(null);

      try {
        const response = await request.put(`/field-permissions/${id}`, dto);

        if (response.success) {
          return response.data as FieldPermission;
        } else {
          throw new Error(response.message || '更新字段权限失败');
        }
      } catch (err: any) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * 删除字段权限配置
   */
  const deleteFieldPermission = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await request.delete(`/field-permissions/${id}`);

      if (response.success) {
        return true;
      } else {
        throw new Error(response.message || '删除字段权限失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 批量创建字段权限
   */
  const batchCreateFieldPermissions = useCallback(async (dtos: CreateFieldPermissionDto[]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await request.post('/field-permissions/batch', dtos);

      if (response.success) {
        return response.data as FieldPermission[];
      } else {
        throw new Error(response.message || '批量创建字段权限失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 切换字段权限启用状态
   */
  const toggleFieldPermission = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await request.put(`/field-permissions/${id}/toggle`, {});

      if (response.success) {
        return response.data as FieldPermission;
      } else {
        throw new Error(response.message || '切换字段权限状态失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取字段访问级别元数据
   */
  const getAccessLevels = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await request.get('/field-permissions/meta/access-levels');

      if (response.success) {
        return response.data as Array<{ value: FieldAccessLevel; label: string }>;
      } else {
        throw new Error(response.message || '获取访问级别失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取操作类型元数据
   */
  const getOperationTypes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await request.get('/field-permissions/meta/operation-types');

      if (response.success) {
        return response.data as Array<{ value: OperationType; label: string }>;
      } else {
        throw new Error(response.message || '获取操作类型失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 获取字段转换规则示例
   */
  const getTransformExamples = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await request.get('/field-permissions/meta/transform-examples');

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.message || '获取转换示例失败');
      }
    } catch (err: any) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // 状态
    fieldPermissions,
    loading,
    error,

    // 查询方法
    fetchFieldPermissions,
    getFieldPermission,
    getRoleFieldPermissions,
    getAccessLevels,
    getOperationTypes,
    getTransformExamples,

    // 修改方法
    createFieldPermission,
    updateFieldPermission,
    deleteFieldPermission,
    batchCreateFieldPermissions,
    toggleFieldPermission,
  };
};

export default useFieldPermission;
