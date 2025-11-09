import React from 'react';
import { Card } from 'antd';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import {
  DataScopeFilterBar,
  CreateEditDataScopeModal,
  DataScopeDetailModal,
  DataScopeStatisticsModal,
} from '@/components/PermissionDataScope';
import { useDataScopeConfig } from '@/hooks/useDataScopeConfig';
import type { DataScope } from '@/hooks/useDataScope';

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
    // ✅ 分页状态
    page,
    pageSize,
    total,
    handlePageChange,
    modalVisible,
    detailModalVisible,
    statisticsModalVisible,
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
    handleShowStatistics,
    handleCloseStatisticsModal,
    handleExport,
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
          totalCount={total}
          onRoleChange={setFilterRoleId}
          onResourceTypeChange={setFilterResourceType}
          onCreate={handleCreate}
          onExport={handleExport}
          onShowStatistics={handleShowStatistics}
        />

        {/* ✅ 真实分页 */}
        <AccessibleTable<DataScope>
          ariaLabel="数据范围配置列表"
          loadingText="正在加载数据范围配置"
          emptyText="暂无数据范围配置，点击右上角创建"
          columns={columns}
          dataSource={dataScopes}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`,
            onChange: handlePageChange,
            pageSizeOptions: ['10', '20', '50', '100', '200'],
          }}
          scroll={{ x: 1400, y: 600 }}
          virtual
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

      <DataScopeStatisticsModal
        visible={statisticsModalVisible}
        dataScopes={dataScopes}
        roles={roles}
        onClose={handleCloseStatisticsModal}
      />
    </div>
  );
};

export default DataScopeConfig;
