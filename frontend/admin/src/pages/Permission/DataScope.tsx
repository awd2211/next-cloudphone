import React from 'react';
import { Table, Card } from 'antd';
import {
  DataScopeFilterBar,
  CreateEditDataScopeModal,
  DataScopeDetailModal,
} from '@/components/PermissionDataScope';
import { useDataScopeConfig } from '@/hooks/useDataScopeConfig';

/**
 * 数据范围配置页面
 * 管理角色对不同资源的数据访问范围
 */
const DataScopeConfig: React.FC = () => {
  const {
    dataScopes,
    scopeTypes,
    roles,
    loading,
    modalVisible,
    detailModalVisible,
    editingScope,
    viewingScope,
    form,
    filterRoleId,
    filterResourceType,
    setFilterRoleId,
    setFilterResourceType,
    columns,
    handleCreate,
    handleSubmit,
    handleCloseModal,
    handleCloseDetailModal,
    getScopeDescription,
  } = useDataScopeConfig();

  return (
    <div>
      <Card>
        <h2>数据范围配置</h2>
        <p style={{ color: '#666', marginBottom: 24 }}>
          配置不同角色对各类资源的数据访问范围，支持全部数据、租户数据、部门数据、本人数据等多种范围类型
        </p>

        <DataScopeFilterBar
          roles={roles}
          filterRoleId={filterRoleId}
          filterResourceType={filterResourceType}
          onRoleChange={setFilterRoleId}
          onResourceTypeChange={setFilterResourceType}
          onCreate={handleCreate}
        />

        <Table
          columns={columns}
          dataSource={dataScopes}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条`,
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      <CreateEditDataScopeModal
        visible={modalVisible}
        editingScope={editingScope}
        form={form}
        roles={roles}
        scopeTypes={scopeTypes}
        onFinish={handleSubmit}
        onOk={() => form.submit()}
        onCancel={handleCloseModal}
      />

      <DataScopeDetailModal
        visible={detailModalVisible}
        viewingScope={viewingScope}
        roles={roles}
        scopeTypes={scopeTypes}
        getScopeDescription={getScopeDescription}
        onClose={handleCloseDetailModal}
      />
    </div>
  );
};

export default DataScopeConfig;
