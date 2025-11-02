import { Card, Table, Space, Alert } from 'antd';
import {
  DataScopeStatsCards,
  DataScopeToolbar,
  CreateDataScopeModal,
  EditDataScopeModal,
  DataScopeDetailModal,
  useDataScopeTableColumns,
} from '@/components/DataScope';
import { useDataScopeManagement } from '@/hooks/useDataScopeManagement';

const DataScopeManagement = () => {
  const {
    dataScopes,
    scopeTypes,
    loading,
    createModalVisible,
    editModalVisible,
    detailModalVisible,
    selectedScope,
    createForm,
    editForm,
    stats,
    setCreateModalVisible,
    loadDataScopes,
    handleCreate,
    handleEdit,
    handleDelete,
    handleToggle,
    openEditModal,
    viewDetail,
    handleCreateCancel,
    handleEditCancel,
    handleDetailClose,
  } = useDataScopeManagement();

  const columns = useDataScopeTableColumns({
    scopeTypes,
    onView: viewDetail,
    onEdit: openEditModal,
    onToggle: handleToggle,
    onDelete: handleDelete,
  });

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          message="数据范围权限管理"
          description="配置角色对不同资源类型的数据访问范围。支持全部数据、租户数据、部门数据、本人数据和自定义范围。"
          type="info"
          showIcon
        />

        <DataScopeStatsCards
          total={stats.total}
          active={stats.active}
          inactive={stats.inactive}
          customCount={stats.byType['custom'] || 0}
        />

        <Card>
          <DataScopeToolbar
            onCreate={() => setCreateModalVisible(true)}
            onRefresh={loadDataScopes}
          />

          <Table
            columns={columns}
            dataSource={dataScopes}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20 }}
            scroll={{ x: 1400 }}
          />
        </Card>
      </Space>

      <CreateDataScopeModal
        visible={createModalVisible}
        form={createForm}
        scopeTypes={scopeTypes}
        onOk={handleCreate}
        onCancel={handleCreateCancel}
      />

      <EditDataScopeModal
        visible={editModalVisible}
        form={editForm}
        scopeTypes={scopeTypes}
        onOk={handleEdit}
        onCancel={handleEditCancel}
      />

      <DataScopeDetailModal
        visible={detailModalVisible}
        selectedScope={selectedScope}
        scopeTypes={scopeTypes}
        onClose={handleDetailClose}
      />
    </div>
  );
};

export default DataScopeManagement;
