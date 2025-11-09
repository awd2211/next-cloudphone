import { Card, Space, Alert } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import {
  DataScopeStatsCards,
  DataScopeToolbar,
  CreateDataScopeModal,
  EditDataScopeModal,
  DataScopeDetailModal,
  useDataScopeTableColumns,
} from '@/components/DataScope';
import { useDataScopeManagement } from '@/hooks/useDataScopeManagement';
import type { DataScope } from '@/types';

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

          <AccessibleTable<DataScope>
            ariaLabel="数据范围权限列表"
            loadingText="正在加载数据范围权限"
            emptyText="暂无数据范围权限，点击右上角创建"
            columns={columns}
            dataSource={dataScopes}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 20,
              pageSizeOptions: ['10', '20', '50', '100', '200'],
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 条`,
            }}
            scroll={{ x: 1400, y: 600 }}
            virtual
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
