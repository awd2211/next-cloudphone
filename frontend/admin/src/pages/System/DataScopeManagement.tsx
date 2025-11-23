import React, { useEffect } from 'react';
import { Card, Space, Alert, Tag, message } from 'antd';
import { ReloadOutlined, SafetyOutlined } from '@ant-design/icons';
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
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import type { DataScope } from '@/types';

const DataScopeManagementContent: React.FC = () => {
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

  // 快捷键支持: Ctrl+R 刷新
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        loadDataScopes();
        message.info('正在刷新数据范围权限...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadDataScopes]);

  // 初始加载状态判断
  const isInitialLoading = loading && dataScopes.length === 0;

  return (
    <div style={{ padding: '24px' }}>
      {/* 页面标题 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ marginBottom: 0 }}>
          <SafetyOutlined style={{ marginRight: 8 }} />
          数据范围权限管理
          <Tag
            icon={<ReloadOutlined spin={loading} />}
            color="processing"
            style={{ marginLeft: 12, cursor: 'pointer' }}
            onClick={() => {
              loadDataScopes();
              message.info('正在刷新数据范围权限...');
            }}
          >
            Ctrl+R 刷新
          </Tag>
        </h2>
      </div>

      <LoadingState
        loading={isInitialLoading}
        onRetry={loadDataScopes}
        errorDescription="加载数据范围权限失败"
        loadingType="skeleton"
        skeletonRows={4}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="数据范围权限说明"
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
              dataSource={dataScopes as any}
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
      </LoadingState>

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

const DataScopeManagement: React.FC = () => {
  return (
    <ErrorBoundary boundaryName="DataScopeManagement">
      <DataScopeManagementContent />
    </ErrorBoundary>
  );
};

export default DataScopeManagement;
