import { useState, useEffect, useCallback } from 'react';
import { Form, message } from 'antd';
import type {
  FieldPermission,
  FieldAccessLevel,
  OperationType,
} from '@/types';
import {
  getAllFieldPermissions,
  getFieldPermissionById,
  getAccessLevels,
  getOperationTypes,
} from '@/services/fieldPermission';
import { useSafeApi } from './useSafeApi';
import {
  FieldPermissionsResponseSchema,
  FieldPermissionDetailResponseSchema,
  AccessLevelsResponseSchema,
  OperationTypesResponseSchema,
} from '@/schemas/api.schemas';

/**
 * 字段权限管理业务逻辑 Hook
 *
 * 功能:
 * 1. 数据加载 (权限列表、访问级别、操作类型) - 使用 useSafeApi + Zod 验证
 * 2. Modal 状态管理
 * 3. 筛选条件管理
 */
export const useFieldPermission = () => {
  // ===== 状态管理 =====
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [editingPermission, setEditingPermission] = useState<FieldPermission | null>(null);
  const [detailPermission, setDetailPermission] = useState<FieldPermission | null>(null);
  const [form] = Form.useForm();

  // ===== 筛选条件 =====
  const [filterRoleId, setFilterRoleId] = useState<string>('');
  const [filterResourceType, setFilterResourceType] = useState<string>('');
  const [filterOperation, setFilterOperation] = useState<OperationType | undefined>(undefined);

  // ===== 数据加载 (使用 useSafeApi) =====

  /**
   * 加载元数据 (访问级别和操作类型)
   */
  const {
    data: accessLevelsResponse,
    execute: executeLoadAccessLevels,
  } = useSafeApi(
    getAccessLevels,
    AccessLevelsResponseSchema,
    {
      errorMessage: '加载访问级别失败',
      fallbackValue: { success: false, data: [] },
      manual: true,
    }
  );

  const {
    data: operationTypesResponse,
    execute: executeLoadOperationTypes,
  } = useSafeApi(
    getOperationTypes,
    OperationTypesResponseSchema,
    {
      errorMessage: '加载操作类型失败',
      fallbackValue: { success: false, data: [] },
      manual: true,
    }
  );

  const accessLevels = accessLevelsResponse?.success ? accessLevelsResponse.data : [];
  const operationTypes = operationTypesResponse?.success ? operationTypesResponse.data : [];

  /**
   * 加载元数据
   */
  const loadMetadata = useCallback(async () => {
    await Promise.all([
      executeLoadAccessLevels(),
      executeLoadOperationTypes(),
    ]);
  }, [executeLoadAccessLevels, executeLoadOperationTypes]);

  /**
   * 加载权限列表
   */
  const {
    data: permissionsResponse,
    loading,
    execute: executeLoadPermissions,
  } = useSafeApi(
    () => {
      const params: any = {};
      if (filterRoleId) params.roleId = filterRoleId;
      if (filterResourceType) params.resourceType = filterResourceType;
      if (filterOperation) params.operation = filterOperation;
      return getAllFieldPermissions(params);
    },
    FieldPermissionsResponseSchema,
    {
      errorMessage: '加载字段权限配置失败',
      fallbackValue: { success: false, data: [] },
    }
  );

  const permissions = permissionsResponse?.success ? permissionsResponse.data : [];

  /**
   * 加载权限详情
   */
  const {
    execute: executeLoadPermissionDetail,
  } = useSafeApi(
    (id: string) => getFieldPermissionById(id),
    FieldPermissionDetailResponseSchema,
    {
      errorMessage: '加载权限详情失败',
      manual: true,
    }
  );

  /**
   * 初始化加载
   */
  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  /**
   * 筛选条件变化时重新加载
   */
  useEffect(() => {
    executeLoadPermissions();
  }, [filterRoleId, filterResourceType, filterOperation, executeLoadPermissions]);

  // ===== 事件处理 =====

  /**
   * 打开创建模态框
   */
  const handleCreate = useCallback(() => {
    setEditingPermission(null);
    form.resetFields();
    setIsModalVisible(true);
  }, [form]);

  /**
   * 打开编辑模态框
   */
  const handleEdit = useCallback(
    (record: FieldPermission) => {
      setEditingPermission(record);
      form.setFieldsValue({
        roleId: record.roleId,
        resourceType: record.resourceType,
        operation: record.operation,
        hiddenFields: record.hiddenFields?.join(', '),
        readOnlyFields: record.readOnlyFields?.join(', '),
        writableFields: record.writableFields?.join(', '),
        requiredFields: record.requiredFields?.join(', '),
        description: record.description,
        priority: record.priority,
      });
      setIsModalVisible(true);
    },
    [form]
  );

  /**
   * 查看详情
   */
  const handleViewDetail = useCallback(async (record: FieldPermission) => {
    const response = await executeLoadPermissionDetail(record.id);
    if (response?.success) {
      setDetailPermission(response.data);
      setIsDetailModalVisible(true);
    }
  }, [executeLoadPermissionDetail]);

  return {
    // 数据
    permissions,
    accessLevels,
    operationTypes,
    loading,

    // Modal 状态
    isModalVisible,
    setIsModalVisible,
    isDetailModalVisible,
    setIsDetailModalVisible,
    editingPermission,
    detailPermission,

    // 筛选条件
    filterRoleId,
    setFilterRoleId,
    filterResourceType,
    setFilterResourceType,
    filterOperation,
    setFilterOperation,

    // Form
    form,

    // 操作方法
    handleCreate,
    handleEdit,
    handleViewDetail,
    loadPermissions: executeLoadPermissions,
  };
};
