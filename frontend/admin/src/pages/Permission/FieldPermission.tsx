import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, Form, message } from 'antd';
import type {
  FieldPermission,
  FieldAccessLevel,
  OperationType,
  CreateFieldPermissionDto,
} from '@/types';
import {
  getAllFieldPermissions,
  getFieldPermissionById,
  createFieldPermission,
  updateFieldPermission,
  deleteFieldPermission,
  toggleFieldPermission,
  getAccessLevels,
  getOperationTypes,
} from '@/services/fieldPermission';
import {
  FieldPermissionStatsCards,
  FieldPermissionToolbar,
  FieldPermissionTable,
  CreateEditFieldPermissionModal,
  FieldPermissionDetailModal,
  getOperationLabel,
} from '@/components/FieldPermission';

const FieldPermissionManagement: React.FC = () => {
  const [permissions, setPermissions] = useState<FieldPermission[]>([]);
  const [accessLevels, setAccessLevels] = useState<
    Array<{ value: FieldAccessLevel; label: string }>
  >([]);
  const [operationTypes, setOperationTypes] = useState<
    Array<{ value: OperationType; label: string }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [editingPermission, setEditingPermission] = useState<FieldPermission | null>(null);
  const [detailPermission, setDetailPermission] = useState<FieldPermission | null>(null);
  const [form] = Form.useForm();
  const [filterRoleId, setFilterRoleId] = useState<string>('');
  const [filterResourceType, setFilterResourceType] = useState<string>('');
  const [filterOperation, setFilterOperation] = useState<OperationType | undefined>(undefined);

  useEffect(() => {
    loadPermissions();
    loadMetadata();
  }, [filterRoleId, filterResourceType, filterOperation]);

  const loadMetadata = async () => {
    try {
      const [accessLevelsRes, operationTypesRes] = await Promise.all([
        getAccessLevels(),
        getOperationTypes(),
      ]);
      if (accessLevelsRes.success) {
        setAccessLevels(accessLevelsRes.data);
      }
      if (operationTypesRes.success) {
        setOperationTypes(operationTypesRes.data);
      }
    } catch (error) {
      message.error('加载元数据失败');
    }
  };

  const loadPermissions = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterRoleId) params.roleId = filterRoleId;
      if (filterResourceType) params.resourceType = filterResourceType;
      if (filterOperation) params.operation = filterOperation;

      const res = await getAllFieldPermissions(params);
      if (res.success) {
        setPermissions(res.data);
      }
    } catch (error) {
      message.error('加载字段权限配置失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = useCallback(() => {
    setEditingPermission(null);
    form.resetFields();
    setIsModalVisible(true);
  }, [form]);

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

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await deleteFieldPermission(id);
        if (res.success) {
          message.success(res.message);
          loadPermissions();
        }
      } catch (error) {
        message.error('删除字段权限配置失败');
      }
    },
    [loadPermissions]
  );

  const handleToggle = useCallback(
    async (record: FieldPermission) => {
      try {
        const res = await toggleFieldPermission(record.id);
        if (res.success) {
          message.success(res.message);
          loadPermissions();
        }
      } catch (error) {
        message.error('切换状态失败');
      }
    },
    [loadPermissions]
  );

  const handleViewDetail = useCallback(async (record: FieldPermission) => {
    try {
      const res = await getFieldPermissionById(record.id);
      if (res.success) {
        setDetailPermission(res.data);
        setIsDetailModalVisible(true);
      }
    } catch (error) {
      message.error('获取详情失败');
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();

      const data: CreateFieldPermissionDto = {
        roleId: values.roleId,
        resourceType: values.resourceType,
        operation: values.operation,
        hiddenFields: values.hiddenFields
          ? values.hiddenFields.split(',').map((s: string) => s.trim())
          : undefined,
        readOnlyFields: values.readOnlyFields
          ? values.readOnlyFields.split(',').map((s: string) => s.trim())
          : undefined,
        writableFields: values.writableFields
          ? values.writableFields.split(',').map((s: string) => s.trim())
          : undefined,
        requiredFields: values.requiredFields
          ? values.requiredFields.split(',').map((s: string) => s.trim())
          : undefined,
        description: values.description,
        priority: values.priority,
      };

      if (editingPermission) {
        const res = await updateFieldPermission(editingPermission.id, data);
        if (res.success) {
          message.success(res.message);
          setIsModalVisible(false);
          loadPermissions();
        }
      } else {
        const res = await createFieldPermission(data);
        if (res.success) {
          message.success(res.message);
          setIsModalVisible(false);
          loadPermissions();
        }
      }
    } catch (error) {
      message.error(editingPermission ? '更新字段权限配置失败' : '创建字段权限配置失败');
    }
  }, [editingPermission, form, loadPermissions]);

  const statistics = useMemo(
    () => ({
      total: permissions.length,
      active: permissions.filter((p) => p.isActive).length,
      inactive: permissions.filter((p) => !p.isActive).length,
      byOperation: {
        create: permissions.filter((p) => p.operation === 'create').length,
        update: permissions.filter((p) => p.operation === 'update').length,
        view: permissions.filter((p) => p.operation === 'view').length,
        export: permissions.filter((p) => p.operation === 'export').length,
      },
    }),
    [permissions]
  );

  return (
    <div style={{ padding: '24px' }}>
      <FieldPermissionStatsCards statistics={statistics} />

      <Card
        title="字段权限管理"
        extra={
          <FieldPermissionToolbar
            filterRoleId={filterRoleId}
            filterResourceType={filterResourceType}
            filterOperation={filterOperation}
            operationTypes={operationTypes}
            onFilterRoleIdChange={(e) => setFilterRoleId(e.target.value)}
            onFilterResourceTypeChange={(e) => setFilterResourceType(e.target.value)}
            onFilterOperationChange={setFilterOperation}
            onRefresh={loadPermissions}
            onCreate={handleCreate}
          />
        }
      >
        <FieldPermissionTable
          permissions={permissions}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggle={handleToggle}
          onViewDetail={handleViewDetail}
        />
      </Card>

      <CreateEditFieldPermissionModal
        visible={isModalVisible}
        editingPermission={editingPermission}
        form={form}
        operationTypes={operationTypes}
        onOk={handleSubmit}
        onCancel={() => setIsModalVisible(false)}
      />

      <FieldPermissionDetailModal
        visible={isDetailModalVisible}
        detailPermission={detailPermission}
        operationTypes={operationTypes}
        getOperationColor={(op) => 'blue'}
        getOperationLabel={(op) => getOperationLabel(op, operationTypes)}
        onClose={() => setIsDetailModalVisible(false)}
      />
    </div>
  );
};

export default FieldPermissionManagement;
