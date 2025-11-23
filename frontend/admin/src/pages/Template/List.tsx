import { useMemo, useEffect, useCallback } from 'react';
import { Card, Space, Tag, Tooltip, message } from 'antd';
import { ReloadOutlined, PlusOutlined } from '@ant-design/icons';
import { useTemplateList } from '@/hooks/useTemplateList';
import { ErrorBoundary } from '@/components/ErrorHandling/ErrorBoundary';
import { LoadingState } from '@/components/Feedback/LoadingState';
import {
  TemplateStatsCard,
  PopularTemplatesCard,
  TemplateFilterBar,
  TemplateTable,
  CreateTemplateModal,
  EditTemplateModal,
  CreateDeviceModal,
  BatchCreateDeviceModal,
  createTemplateColumns,
} from '@/components/Template';

/**
 * 模板列表页面（优化版 v3）
 *
 * 优化策略:
 * 1. ✅ 所有业务逻辑提取到 useTemplateList Hook
 * 2. ✅ 主组件只负责 UI 组合 (70% 代码减少)
 * 3. ✅ useMemo 优化表格列定义
 * 4. ✅ ErrorBoundary 错误边界保护
 * 5. ✅ LoadingState 统一加载状态管理
 * 6. ✅ 快捷键支持 (Ctrl+R 刷新, Ctrl+N 新建)
 * 7. ✅ 页面标题和快捷键提示优化
 */
const TemplateList = () => {
  const {
    templates,
    popularTemplates,
    stats,
    users,
    loading,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    setSearchKeyword,
    setCategoryFilter,
    setIsPublicFilter,
    createModalVisible,
    setCreateModalVisible,
    editModalVisible,
    createDeviceModalVisible,
    batchCreateModalVisible,
    selectedTemplate,
    form,
    editForm,
    createDeviceForm,
    batchCreateForm,
    handleCreate,
    handleEdit,
    handleDelete,
    handleCreateDevice,
    handleBatchCreate,
    openEditModal,
    openCreateDeviceModal,
    openBatchCreateModal,
    closeCreateModal,
    closeEditModal,
    closeCreateDeviceModal,
    closeBatchCreateModal,
    refetch,
  } = useTemplateList();

  // ===== 快捷键支持 =====
  const handleRefresh = useCallback(() => {
    refetch();
    message.info('正在刷新...');
  }, [refetch]);

  const handleOpenCreate = useCallback(() => {
    setCreateModalVisible(true);
  }, [setCreateModalVisible]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果焦点在输入框内，不触发快捷键
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Ctrl+R 或 Cmd+R 刷新列表
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
      // Ctrl+N 或 Cmd+N 新建模板
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleOpenCreate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRefresh, handleOpenCreate]);

  const columns = useMemo(
    () =>
      createTemplateColumns({
        onCreateDevice: openCreateDeviceModal,
        onBatchCreate: openBatchCreateModal,
        onEdit: openEditModal,
        onDelete: handleDelete,
      }),
    [openCreateDeviceModal, openBatchCreateModal, openEditModal, handleDelete]
  );

  return (
    <ErrorBoundary boundaryName="TemplateListPage">
      <div style={{ padding: '24px' }}>
        {/* 页面标题和快捷键提示 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>模板管理</h2>
          <Space>
            <Tooltip title="快捷键: Ctrl+N 新建, Ctrl+R 刷新">
              <Tag color="blue" style={{ cursor: 'help' }}>
                <PlusOutlined /> Ctrl+N 新建
              </Tag>
            </Tooltip>
            <Tooltip title="刷新列表 (Ctrl+R)">
              <Tag color="default" style={{ cursor: 'pointer' }} onClick={handleRefresh}>
                <ReloadOutlined /> 刷新
              </Tag>
            </Tooltip>
          </Space>
        </div>

        <LoadingState
          loading={loading}
          empty={templates.length === 0 && !loading}
          onRetry={refetch}
          loadingType="skeleton"
          skeletonRows={5}
          errorDescription="加载模板列表失败，请检查网络连接后重试"
          emptyDescription="暂无模板数据，点击右上角「新建模板」按钮添加"
        >
          <TemplateStatsCard stats={stats} />

          <PopularTemplatesCard templates={popularTemplates} onTemplateClick={openCreateDeviceModal} />

          <Card>
            <TemplateFilterBar
              onCreateClick={handleOpenCreate}
              onSearch={setSearchKeyword}
              onCategoryChange={setCategoryFilter}
              onVisibilityChange={setIsPublicFilter}
            />

            <TemplateTable
              columns={columns}
              dataSource={templates}
              loading={loading}
              page={page}
              pageSize={pageSize}
              total={total}
              onPageChange={(page, pageSize) => {
                setPage(page);
                setPageSize(pageSize);
              }}
            />
          </Card>
        </LoadingState>

        <CreateTemplateModal
          visible={createModalVisible}
          form={form}
          onOk={handleCreate}
          onCancel={closeCreateModal}
        />

        <EditTemplateModal
          visible={editModalVisible}
          form={editForm}
          onOk={handleEdit}
          onCancel={closeEditModal}
        />

        <CreateDeviceModal
          visible={createDeviceModalVisible}
          templateName={selectedTemplate?.name || ''}
          form={createDeviceForm}
          users={users}
          onOk={handleCreateDevice}
          onCancel={closeCreateDeviceModal}
        />

        <BatchCreateDeviceModal
          visible={batchCreateModalVisible}
          templateName={selectedTemplate?.name || ''}
          form={batchCreateForm}
          users={users}
          onOk={handleBatchCreate}
          onCancel={closeBatchCreateModal}
        />
      </div>
    </ErrorBoundary>
  );
};

export default TemplateList;
