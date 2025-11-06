import React, { useMemo, useCallback } from 'react';
import { Card, message } from 'antd';
import type {
  FieldPermission,
  FieldAccessLevel,
  OperationType,
  CreateFieldPermissionDto,
} from '@/types';
import {
  createFieldPermission,
  updateFieldPermission,
  deleteFieldPermission,
  toggleFieldPermission,
} from '@/services/fieldPermission';
import { useFieldPermission } from '@/hooks/useFieldPermission';
import {
  FieldPermissionStatsCards,
  FieldPermissionToolbar,
  FieldPermissionTable,
  CreateEditFieldPermissionModal,
  FieldPermissionDetailModal,
  getOperationLabel,
} from '@/components/FieldPermission';

const FieldPermissionManagement: React.FC = () => {
  // ✅ 使用重构后的 hook
  const {
    permissions,
    accessLevels,
    operationTypes,
    loading,
    isModalVisible,
    setIsModalVisible,
    isDetailModalVisible,
    setIsDetailModalVisible,
    editingPermission,
    detailPermission,
    filterRoleId,
    setFilterRoleId,
    filterResourceType,
    setFilterResourceType,
    filterOperation,
    setFilterOperation,
    form,
    handleCreate,
    handleEdit,
    handleViewDetail,
    loadPermissions,
  } = useFieldPermission();

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
