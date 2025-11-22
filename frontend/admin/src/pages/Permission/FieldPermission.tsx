import React, { useMemo, useCallback } from 'react';
import { Card, message } from 'antd';
import type {
  FieldPermission,
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
  // ✅ 使用优化后的 hook（支持分页 + 统计数据）
  const {
    permissions,
    total,
    // accessLevels, // 未使用
    operationTypes,
    loading,
    stats,
    // statsLoading, // 未使用
    page,
    pageSize,
    handlePageChange,
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
        await deleteFieldPermission(id);
        message.success('删除成功');
        loadPermissions();
      } catch (error) {
        message.error('删除字段权限配置失败');
      }
    },
    [loadPermissions]
  );

  const handleToggle = useCallback(
    async (record: FieldPermission) => {
      try {
        await toggleFieldPermission(record.id);
        message.success('状态切换成功');
        loadPermissions();
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
        await updateFieldPermission(editingPermission.id, data);
        message.success('更新成功');
        setIsModalVisible(false);
        loadPermissions();
      } else {
        await createFieldPermission(data);
        message.success('创建成功');
        setIsModalVisible(false);
        loadPermissions();
      }
    } catch (error) {
      message.error(editingPermission ? '更新字段权限配置失败' : '创建字段权限配置失败');
    }
  }, [editingPermission, form, loadPermissions]);

  // ✅ 使用服务端聚合统计数据，而非客户端计算
  const statistics = useMemo(
    () => ({
      total: stats?.total || 0,
      active: stats?.active || 0,
      inactive: stats?.inactive || 0,
      byOperation: {
        create: (stats?.byOperation as any)?.create || 0,
        update: (stats?.byOperation as any)?.update || 0,
        view: (stats?.byOperation as any)?.view || 0,
        export: (stats?.byOperation as any)?.export || 0,
      },
    }),
    [stats]
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
            onFilterRoleIdChange={(value) => setFilterRoleId(value)}
            onFilterResourceTypeChange={(value) => setFilterResourceType(value)}
            onFilterOperationChange={setFilterOperation}
            onRefresh={loadPermissions}
            onCreate={handleCreate}
          />
        }
      >
        <FieldPermissionTable
          permissions={permissions}
          loading={loading}
          total={total}
          page={page}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          operationTypes={operationTypes}
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
        getOperationColor={() => 'blue'}
        getOperationLabel={(op) => getOperationLabel(op, operationTypes)}
        onClose={() => setIsDetailModalVisible(false)}
      />
    </div>
  );
};

export default FieldPermissionManagement;
