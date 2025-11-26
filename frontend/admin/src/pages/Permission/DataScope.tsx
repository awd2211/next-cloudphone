import React, { useEffect, useCallback } from 'react';
import { Card, Tag, message } from 'antd';
import { DatabaseOutlined, ReloadOutlined } from '@ant-design/icons';
import AccessibleTable from '@/components/Accessible/AccessibleTable';
import {
  DataScopeFilterBar,
  CreateEditDataScopeModal,
  DataScopeDetailModal,
  DataScopeStatisticsModal,
} from '@/components/PermissionDataScope';
import { useDataScopeConfig } from '@/hooks/useDataScopeConfig';
import type { DataScope } from '@/hooks/useDataScope';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import { NEUTRAL_LIGHT } from '@/theme';

/**
 * 数据范围配置页面
 * 管理角色对不同资源的数据访问范围
 *
 * 优化点：
 * 1. ✅ ErrorBoundary 错误边界包裹
 * 2. ✅ LoadingState 统一加载状态
 * 3. ✅ 快捷键支持 (Ctrl+R 刷新)
 * 4. ✅ 页面标题优化
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
    loadData,
  } = useDataScopeConfig();

  // ✅ 刷新处理
  const handleRefresh = useCallback(() => {
    loadData?.();
    message.success('刷新成功');
  }, [loadData]);

  // ✅ 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        loadData?.();
        message.info('正在刷新...');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadData]);

  return (
    <ErrorBoundary boundaryName="DataScope">
      <Card bordered={false}>
        {/* 页面标题 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <h2 style={{ marginBottom: 0 }}>
            <DatabaseOutlined style={{ marginRight: 8 }} />
            数据范围配置
            <Tag
              icon={<ReloadOutlined spin={loading} />}
              color="processing"
              style={{ marginLeft: 12, cursor: 'pointer' }}
              onClick={handleRefresh}
            >
              Ctrl+R 刷新
            </Tag>
          </h2>
        </div>
        <p style={{ color: NEUTRAL_LIGHT.text.secondary, marginBottom: 24 }}>
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

        {/* ✅ 使用 LoadingState 包裹表格 */}
        <LoadingState
          loading={loading}
          empty={!loading && dataScopes.length === 0}
          onRetry={loadData}
          loadingType="skeleton"
          skeletonRows={5}
          emptyDescription="暂无数据范围配置，点击右上角创建"
        >
          <AccessibleTable<DataScope>
            ariaLabel="数据范围配置列表"
            loadingText="正在加载数据范围配置"
            emptyText="暂无数据范围配置，点击右上角创建"
            columns={columns}
            dataSource={dataScopes}
            rowKey="id"
            loading={false}
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
        </LoadingState>
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
    </ErrorBoundary>
  );
};

export default DataScopeConfig;
