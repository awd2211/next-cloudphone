import request from '@/utils/request';
import type {
  FieldPermission,
  FieldAccessLevel,
  OperationType,
  CreateFieldPermissionDto,
  UpdateFieldPermissionDto,
} from '@/types';

/**
 * 获取访问级别元数据
 */
export const getAccessLevels = () => {
  return request.get<{
    success: boolean;
    data: Array<{
      value: FieldAccessLevel;
      label: string;
    }>;
  }>('/field-permissions/meta/access-levels');
};

/**
 * 获取操作类型元数据
 */
export const getOperationTypes = () => {
  return request.get<{
    success: boolean;
    data: Array<{
      value: OperationType;
      label: string;
    }>;
  }>('/field-permissions/meta/operation-types');
};

/**
 * 获取所有字段权限配置
 */
export const getAllFieldPermissions = (params?: {
  roleId?: string;
  resourceType?: string;
  operation?: OperationType;
  isActive?: boolean;
}) => {
  return request.get<{
    success: boolean;
    data: FieldPermission[];
    total: number;
  }>('/field-permissions', { params });
};

/**
 * 获取单个字段权限配置
 */
export const getFieldPermissionById = (id: string) => {
  return request.get<{
    success: boolean;
    data: FieldPermission;
  }>(`/field-permissions/${id}`);
};

/**
 * 获取角色的字段权限配置
 */
export const getFieldPermissionsByRole = (roleId: string, resourceType?: string) => {
  const params = resourceType ? { resourceType } : undefined;
  return request.get<{
    success: boolean;
    data: Record<string, FieldPermission[]>; // 按资源类型分组
    total: number;
  }>(`/field-permissions/role/${roleId}`, { params });
};

/**
 * 创建字段权限配置
 */
export const createFieldPermission = (data: CreateFieldPermissionDto) => {
  return request.post<{
    success: boolean;
    message: string;
    data: FieldPermission;
  }>('/field-permissions', data);
};

/**
 * 更新字段权限配置
 */
export const updateFieldPermission = (id: string, data: UpdateFieldPermissionDto) => {
  return request.put<{
    success: boolean;
    message: string;
    data: FieldPermission;
  }>(`/field-permissions/${id}`, data);
};

/**
 * 删除字段权限配置
 */
export const deleteFieldPermission = (id: string) => {
  return request.delete<{
    success: boolean;
    message: string;
  }>(`/field-permissions/${id}`);
};

/**
 * 批量创建字段权限配置
 */
export const batchCreateFieldPermissions = (data: CreateFieldPermissionDto[]) => {
  return request.post<{
    success: boolean;
    message: string;
    data: FieldPermission[];
  }>('/field-permissions/batch', data);
};

/**
 * 启用/禁用字段权限配置
 */
export const toggleFieldPermission = (id: string) => {
  return request.put<{
    success: boolean;
    message: string;
    data: FieldPermission;
  }>(`/field-permissions/${id}/toggle`);
};

/**
 * 获取字段转换规则示例 (P3 优先级)
 */
export const getTransformExamples = () => {
  return request.get<{
    success: boolean;
    data: {
      mask: {
        description: string;
        examples: Array<{
          field: string;
          transform: { type: string; pattern: string };
          example: string;
        }>;
      };
      hash: {
        description: string;
        example: { type: string };
        result: string;
      };
      remove: {
        description: string;
        example: { type: string };
        result: string;
      };
      replace: {
        description: string;
        example: { type: string; value: string };
        result: string;
      };
    };
  }>('/field-permissions/meta/transform-examples');
};
